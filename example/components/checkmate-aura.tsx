import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Skia,
  Canvas,
  Fill,
  Shader,
  ImageShader,
  makeImageFromView,
} from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { theme } from './theme';

// Checkmate transition. The glass ripple from the mated king is the APPLICATOR:
// as the shell sweeps outward it progressively BLURS and tints the board in its
// wake — sharp ahead of the front, frosted accent-blue haze behind. The wave
// transforms the live board into a settled aurora; a calm result card then
// rises. One motion: ripple → blur → haze → card. (The maximalist doom phase —
// imploding void, swirling stars — is gone; the wave's only job now is to carry
// the screen into the haze.)
const WAVE_SKSL = `
uniform shader image;       // snapshot of the screen
uniform float2 u_res;
uniform float2 u_origin;    // wipe origin (the mated king)
uniform float u_progress;   // 0 → 1 (the shell sweeping out)
uniform float u_maxRadius;
uniform float u_band;       // shell softness / thickness (px)
uniform float u_amplitude;  // refraction at the shell (px)
uniform float u_chroma;     // chromatic split at the crest (subtle, on-palette)
uniform float u_glowStrength;
uniform float u_wobble;     // non-circular wavefront (organic)
uniform float u_maxBlur;    // blur radius reached well behind the front (px)
uniform float u_breath;     // slow breathing 0..1 for the settled glow
uniform float u_tint;       // how strongly the wake is tinted toward the aurora
uniform float3 u_glow;      // neutral cool-white glow (linear 0..1)
uniform float3 u_deep;      // deep base the board dissolves into
uniform float3 u_spark;     // bright spark colour for the gather

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

// Cosine spectral palette (IQ) — t in 0..1 sweeps the full hue circle. Used to
// paint an iridescent rim on the expanding crest.
half3 spectrum(float t) {
  return half3(0.5 + 0.5 * cos(6.2831853 * (t + float3(0.0, 0.33, 0.67))));
}

// Golden-angle (Vogel) disk blur. Concentric rings ghost each feature into a
// handful of discrete copies (a grid); a spiral with sqrt-distributed radii
// spreads 20 taps evenly across the disk for a smooth, gridless frost. Radius
// below a pixel ⇒ a single sharp tap, so blur scales with the wake for free.
half3 blurSample(float2 p, float r) {
  if (r < 0.75) return image.eval(p).rgb;
  half3 acc = half3(0.0);
  // 32 taps + per-pixel rotation jitter → smooth gaussian-like frost even at
  // large radii (no ghosting / banding).
  float j = hash(p) * 6.2831853;
  for (float i = 0.0; i < 32.0; i += 1.0) {
    float t = (i + 0.5) / 32.0;
    float rad = sqrt(t) * r;          // sqrt ⇒ uniform area density
    float a = i * 2.39996323 + j;     // golden angle + jitter
    acc += image.eval(p + float2(cos(a), sin(a)) * rad).rgb;
  }
  return acc / 32.0;
}

half4 main(float2 position) {
  float2 toOrigin = position - u_origin;
  float dist = length(toOrigin);
  float2 dir = dist > 0.0001 ? toOrigin / dist : float2(0.0);

  float ang = atan(toOrigin.y, toOrigin.x);
  float wob =
    1.0 + u_wobble * (sin(ang * 3.0) * 0.6 + sin(ang * 2.0 + 1.7) * 0.4);

  float w = u_band;

  // The blur + chromatic-aberration wave expands from the king from the start —
  // ease-out so it bursts then decelerates, exiting the screen while still fast.
  float released = smoothstep(0.0, 0.12, u_progress);  // crest fades in quickly
  // Front finishes its expansion by ~progress 0.7 (was 1.0), so the second part
  // — the wave clearing the upper screen + the grey/blur settling — is faster,
  // while the initial burst (the first wave) is unchanged.
  float fT = clamp((u_progress - 0.02) / 0.5, 0.0, 1.0);
  float fe = 1.0 - pow(1.0 - fT, 2.2);             // ease-out, snappier tail
  float front = u_maxRadius * fe * wob;
  float x = dist - front;                          // signed dist from the rim
  float lens = exp(-(x * x) / (2.0 * w * w));       // dome cross-section
  float shell = lens * released;

  // LENS magnification: the dome's slope pulls the board toward the crest on
  // both flanks, so the board is magnified THROUGH the glass (a convex lens),
  // not merely shoved outward. Dispersion (chroma) scales with the bend.
  float grad = -(x / (w * w)) * lens;               // dome slope (odd)
  float bend = grad * w * u_amplitude * released;
  float2 off = dir * bend;
  float2 ca = dir * (abs(bend) * u_chroma);

  // Frost LAGS well behind the dome, so the glass travels over the still sharp,
  // lit board — its 3D shading needs that bright substrate to read (a glass
  // dome over black just looks like a flat glowing ring).
  // ONE soft radial DROP grows from the king and covers the whole screen — the
  // grey + blur both fill from this single growing disc with a huge soft edge
  // (no hard arc, no second source from the top). It trails just behind the
  // chroma front and keeps expanding until it covers everything.
  float dropR = u_maxRadius * smoothstep(0.06, 0.6, u_progress) * 1.35;
  float passed = smoothstep(dropR, dropR - u_res.x * 0.9, dist);
  // Blur follows the wake during the sweep, but a global settle-blur ramps in
  // toward the end so the WHOLE board ends uniformly blurred (no lighter top
  // edge / inconsistency at rest).
  float blurR = passed * (u_maxBlur + 2.5 * u_breath);

  // The board RECEDES as it frosts — sampled coords expand from centre, so the
  // image gently pulls back into depth behind the haze instead of sitting flat.
  float2 center = u_res * 0.5;
  float recede = 1.0 + 0.045 * smoothstep(0.2, 1.0, u_progress) * passed;

  float2 sp = center + (position - center) * recede + off;

  // Chromatic aberration rides TWO boundaries so the effect is continuous:
  //  • the dome crest (the leading wave) — full strength (ca),
  //  • the trailing GREY-FILL edge, where the grey backdrop arrives — subtler,
  //    so the grey "drop" carries the same RGB-fringe language as the front.
  float greyFront = front - dist - w * 2.4;             // grey region (>0 inside)
  float greyEdge = exp(-(greyFront * greyFront) / (2.0 * (w * 3.0) * (w * 3.0)));
  // The whole chromatic wave is TRANSIENT — it fades out by the end so nothing
  // colourful freezes onto the final screen (it passes like a wave).
  float waveFade = 1.0 - smoothstep(0.45, 0.62, u_progress);
  float2 ca2 = dir * (greyEdge * w * u_chroma * 0.5);   // subtler edge chroma
  float2 caT = (ca + ca2) * waveFade;
  float chromaMix = max(shell, greyEdge) * waveFade;

  half3 g = blurSample(sp, blurR);
  half r = image.eval(sp + caT).r;
  half b = image.eval(sp - caT).b;
  half3 col =
    half3(mix(g.r, r, chromaMix), g.g, mix(g.b, b, chromaMix));

  // ===== 3D glass dome lighting =====
  // The dome rides over the still-sharp board, so the board is the midtone
  // substrate: lighting a surface normal built from the dome slope gives a lit
  // near flank, a shaded far flank, a sharp travelling glint and a bright
  // fresnel rim — real glass volume, not a flat ring.
  float3 N = normalize(float3(-dir * (grad * w * 0.9), 1.0));
  float3 L3 = normalize(float3(-0.5, -0.78, 0.6));     // key light, upper-left
  float3 H = normalize(L3 + float3(0.0, 0.0, 1.0));
  float diff = dot(N, L3);
  float spec = pow(max(dot(N, H), 0.0), 60.0);
  col += half3(0.82, 0.88, 1.0) * (clamp(diff, 0.0, 1.0) * shell * 0.32);
  col *= 1.0 - clamp(-diff, 0.0, 1.0) * shell * 0.4;   // shaded far flank
  col += half3(1.0, 1.0, 1.0) * (spec * shell * 2.4);  // sharp glass glint
  float rim = exp(-(x * x) / (2.0 * (w * 0.45) * (w * 0.45))) * released;
  col += half3(0.85, 0.9, 1.0) * (rim * 0.18);         // bright fresnel lip

  // RAINBOW: an iridescent spectral sheen on the wave crest — hue sweeps by
  // angle + radius — so the chromatic aberration reads as rainbow colour riding
  // the wavefront. The trailing grey-fill edge gets a subtler version too, so
  // both boundaries shimmer with the same colour.
  // Analogous palette LINKED to the board's blue — the hue only drifts through
  // green ↔ blue ↔ purple (adjacent hues), never the full rainbow. The IQ
  // cosine palette maps purple≈0.17, blue≈0.33, cyan≈0.5, green≈0.67, so we keep
  // the hue oscillating within that band, centred near blue.
  float hueT = 0.42 + 0.24 * sin(ang * 2.0 + dist * 0.008 + u_progress * 2.5);
  col += spectrum(hueT) * (shell * u_glowStrength * waveFade);
  col += spectrum(hueT) * (greyEdge * u_glowStrength * 0.4 * waveFade);
  // Gentle light riding the grey-drop edge — soft and cool, subtler than the
  // front wave's glint, and it fades out with the wave too.
  col += half3(0.78, 0.84, 1.0) * (greyEdge * 0.11 * waveFade);

  // Settled backdrop: a dark, near-black field with a VERY faint, slow gradient
  // lift toward the king — barely perceptible and quiet, the calm aftermath of
  // the wave (not a sharp pulsing grey disconnected from the motion).
  float md = max(u_res.x, u_res.y);
  float kd = dist / md;
  float glow = exp(-kd * kd * 6.5) * (0.85 + 0.15 * u_breath); // barely breathes
  // Dark GREY (not black) tint, applied with transparency so the heavily
  // blurred chessboard stays faintly visible behind the analysis.
  half3 grey = half3(0.038, 0.046, 0.075); // bluish grey
  half3 backdrop = mix(grey, half3(u_glow), clamp(glow * 0.06, 0.0, 1.0));
  // The grey fills via a soft GLOBAL ramp (uniform, no radial arc) once the wave
  // has passed — so it reads as a diffuse grey blur settling over the board, not
  // a hard-edged drop following the wavefront. (Still trails the wave: the
  // global ramp only rises after the front has swept.)
  col = mix(col, backdrop, passed * u_tint);

  // ===== Frosted GLASS surface over the settled board =====
  // Fine grain + a soft diagonal light sheen, so the less-blurred board reads as
  // a pane of frosted glass rather than just a light blur.
  col += (hash(position * 0.7) - 0.5) * 0.03 * passed;       // frosted grain
  float diag = (position.x * 0.5 + position.y) / (u_res.y * 1.3);
  float sheen = exp(-pow((diag - 0.32) * 2.4, 2.0));         // soft light band
  col += half3(0.55, 0.63, 0.85) * (sheen * 0.03 * passed);  // glass sheen

  // Faint global grain.
  col += (hash(floor(position)) - 0.5) * 0.015;

  // Cinematic vignette — the haze deepens toward the corners so it reads as a
  // lit volume with depth, not a flat grey panel. Only in the settled wake.
  float2 uvc = position / u_res - 0.5;
  float vig = 1.0 - smoothstep(0.5, 1.05, length(uvc) * 1.25);
  col *= mix(1.0, 0.72 + 0.28 * vig, passed);

  // Darken the bottom half so the game-review text reads clearly over it.
  float vy = position.y / u_res.y;                    // 0 top → 1 bottom
  float bottomDark = smoothstep(0.3, 0.62, vy) * 0.8;
  col *= 1.0 - bottomDark * passed;

  return half4(col, 1.0);
}
`;

const WAVE = Skia.RuntimeEffect.Make(WAVE_SKSL)!;

// Neutral cool-white glow — the haze recedes; only a faint light at the king.
// No accent hue, so the recap's red/green annotations carry the only colour.
const GLOW: [number, number, number] = [0.8, 0.85, 0.95];
// Near-black base the board sinks into, so the haze reads as a dark volume and
// the only colour is the iridescent wave crest (a touch below theme.bg).
const DEEP: [number, number, number] = [0.022, 0.026, 0.036];
// Bright cold spark for the gather — reads as light against the dark.
const SPARK: [number, number, number] = [0.78, 0.85, 1.0];

// One continuous curve: a short charge, a decisive sweep off the screen, then
// the recap. Snappy — a transition, not a cutscene.
const WAVE_MS = 3000;
const EXIT_MS = 360;

// Move-quality classification for the recap (chess.com style).
export type Quality =
  | 'brilliant'
  | 'best'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export type AnnotatedMove = { san: string; quality: Quality };

const QUALITY: Record<
  Quality,
  { glyph: string; color: string; label: string }
> = {
  brilliant: { glyph: '!!', color: '#26c6da', label: 'Brilliant' },
  best: { glyph: '✓', color: theme.win, label: 'Best' },
  good: { glyph: '', color: theme.textMuted, label: 'Good' },
  inaccuracy: { glyph: '?!', color: '#e8c14a', label: 'Inaccuracy' },
  mistake: { glyph: '?', color: '#e8973a', label: 'Mistake' },
  blunder: { glyph: '??', color: theme.lose, label: 'Blunder' },
};
// Rows shown in the recap table, best → worst.
const TABLE_ORDER: Quality[] = [
  'brilliant',
  'best',
  'inaccuracy',
  'mistake',
  'blunder',
];
const hexA = (hex: string, a: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
};

type ShowOpts = {
  x: number; // king window-x
  y: number; // king window-y
  subtitle: string; // "<winner> wins"
  oppName: string;
  accuracy: { you: number; opp: number };
  moves: AnnotatedMove[];
  onRematch: () => void;
  onReview: () => void;
};

type AuraApi = { show: (opts: ShowOpts) => void; hide: () => void };
const AuraContext = createContext<AuraApi>({ show: () => {}, hide: () => {} });
export const useCheckmateAura = () => useContext(AuraContext);

// Each recap row enters with its OWN spring — fades + lifts up into place —
// staggered by index, so the table cascades in with real physics instead of a
// hand-rolled smoothstep. (reanimated entering layout animation, springified.)
const enterRow = (index: number) =>
  FadeInDown.delay(index * 70)
    .springify()
    .mass(0.8)
    .damping(14) // just-perceptible overshoot — subtle, but there
    .stiffness(140);

export const CheckmateAuraProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { width, height } = useWindowDimensions();
  const rootRef = useRef<View>(null);
  const contentRef = useRef<View>(null); // wraps children only (no Canvas)
  const busy = useRef(false);

  const snapshot = useSharedValue<SkImage | null>(null);
  const progress = useSharedValue(0); // the shell sweeping out
  const breath = useSharedValue(0); // settled-glow breathing loop
  const vis = useSharedValue(0); // overlay opacity (show / hide)
  const origin = useSharedValue({ x: width / 2, y: height * 0.4 });

  // React state only for the (rare) card content — never per-frame.
  const [card, setCard] = useState<ShowOpts | null>(null);

  const maxRadius = useDerivedValue(() => {
    const ox = origin.value.x;
    const oy = origin.value.y;
    return (
      Math.max(
        Math.hypot(ox, oy),
        Math.hypot(width - ox, oy),
        Math.hypot(ox, height - oy),
        Math.hypot(width - ox, height - oy)
      ) * 1.28
    );
  });

  const uniforms = useDerivedValue(() => ({
    u_res: [width, height],
    u_origin: [origin.value.x, origin.value.y],
    u_progress: progress.value,
    u_maxRadius: maxRadius.value,
    u_band: 64,
    u_amplitude: 50,
    u_chroma: 0.28,
    u_glowStrength: 0.55,
    u_wobble: 0.04,
    u_maxBlur: 24,
    u_breath: breath.value,
    u_tint: 0.8,
    u_glow: GLOW,
    u_deep: DEEP,
    u_spark: SPARK,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: vis.value,
    pointerEvents: vis.value > 0.5 ? 'auto' : 'none',
  }));

  // Container just gates the recap with the overlay; each row's own entering
  // spring (enterRow) does the cascade-in.
  const cardStyle = useAnimatedStyle(() => ({ opacity: vis.value }));

  const clearCard = useCallback(() => setCard(null), []);

  // Free the snapshot + card once fully hidden.
  useAnimatedReaction(
    () => vis.value,
    (v, prev) => {
      if (prev !== null && prev > 0.01 && v <= 0.01) {
        snapshot.value = null;
        progress.value = 0;
        busy.current = false;
        scheduleOnRN(clearCard);
      }
    }
  );

  const show = useCallback(
    async (opts: ShowOpts) => {
      if (busy.current) return;
      busy.current = true;
      origin.value = { x: opts.x, y: opts.y };
      // Snapshot the board content ONLY — not the root (which contains the Skia
      // Canvas). Capturing a view that holds a Canvas forces a synchronous
      // Canvas flush on iOS → a one-frame flicker.
      const image = await makeImageFromView(contentRef);
      if (!image) {
        busy.current = false;
        return;
      }
      snapshot.value = image;
      progress.value = 0;
      // Reveal on the NEXT frame: this gives the Canvas one frame to paint the
      // new SkImage (while the overlay is still invisible) so its texture is
      // uploaded to the GPU before we show it. Flipping vis in the same frame
      // paints one black frame before the texture lands → the flicker.
      requestAnimationFrame(() => {
        // Overlay covers — at progress 0 it is identical to the live board
        // (invisible cut), then the wave sweeps the blur across it.
        vis.value = 1;
        // Linear time — the drama lives in the dome's expansion SHAPE (an
        // ease-out shockwave, in the shader), not in the global clock. So the
        // gather/flash pace evenly while the dome still detonates.
        progress.value = withTiming(1, {
          duration: WAVE_MS,
          easing: Easing.linear,
        });
        // Slow breathing for the settled glow — shared value + withRepeat.
        breath.value = 0;
        breath.value = withRepeat(
          withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      });
      // Mount the recap once the wave has swept the board — each row's entering
      // spring then cascades it into place.
      setTimeout(() => setCard(opts), Math.round(WAVE_MS * 0.55) - 750);
    },
    [origin, snapshot, progress, breath, vis]
  );

  const hide = useCallback(() => {
    vis.value = withTiming(0, {
      duration: EXIT_MS,
      easing: Easing.in(Easing.cubic),
    });
  }, [vis]);

  const api = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <AuraContext.Provider value={api}>
      <View ref={rootRef} collapsable={false} style={styles.fill}>
        <View ref={contentRef} collapsable={false} style={styles.fill}>
          {children}
        </View>
        <Animated.View
          style={[StyleSheet.absoluteFill, overlayStyle]}
          pointerEvents="box-none"
        >
          <Canvas style={styles.fill} pointerEvents="none">
            <Fill>
              <Shader source={WAVE} uniforms={uniforms}>
                <ImageShader
                  image={snapshot}
                  fit="cover"
                  width={width}
                  height={height}
                />
              </Shader>
            </Fill>
          </Canvas>

          {card ? (
            <Animated.View style={[styles.cardWrap, cardStyle]}>
              <Animated.View entering={enterRow(0)}>
                <Text style={styles.recapKicker}>GAME REVIEW</Text>
                <Text style={styles.recapTitle}>{card.subtitle}</Text>
              </Animated.View>

              {/* Accuracy header: avatar + name + pill per player. */}
              <Animated.View entering={enterRow(1)}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Accuracy</Text>
                  <View style={styles.cell}>
                    <View style={[styles.avatar, styles.avatarYou]}>
                      <Text style={[styles.avatarGlyph, { color: theme.bg }]}>
                        ♚
                      </Text>
                    </View>
                    <Text style={styles.cellName}>you</Text>
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>
                        {card.accuracy.you.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cell}>
                    <View style={[styles.avatar, styles.avatarOpp]}>
                      <Text style={[styles.avatarGlyph, { color: theme.text }]}>
                        ♚
                      </Text>
                    </View>
                    <Text style={styles.cellName} numberOfLines={1}>
                      {card.oppName}
                    </Text>
                    <View style={[styles.pill, styles.pillWin]}>
                      <Text style={styles.pillText}>
                        {card.accuracy.opp.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>

              <Animated.View entering={enterRow(2)}>
                <View style={styles.tableDivider} />
              </Animated.View>

              {/* Quality breakdown: per-side counts flanking a centred icon. */}
              {TABLE_ORDER.map((q, qi) => {
                const you = card.moves.filter(
                  (m, i) => i % 2 === 0 && m.quality === q
                ).length;
                const opp = card.moves.filter(
                  (m, i) => i % 2 === 1 && m.quality === q
                ).length;
                const c = QUALITY[q];
                return (
                  <Animated.View key={q} entering={enterRow(3 + qi)}>
                    <View style={styles.qRow}>
                      <View style={styles.qLeft}>
                        <View
                          style={[
                            styles.qIcon,
                            { backgroundColor: hexA(c.color, 0.16) },
                          ]}
                        >
                          <Text style={[styles.qGlyph, { color: c.color }]}>
                            {c.glyph || '•'}
                          </Text>
                        </View>
                        <Text style={styles.qLabel}>{c.label}</Text>
                      </View>
                      <Text
                        style={[styles.qCount, you === 0 && styles.qCountZero]}
                      >
                        {you}
                      </Text>
                      <Text
                        style={[styles.qCount, opp === 0 && styles.qCountZero]}
                      >
                        {opp}
                      </Text>
                    </View>
                  </Animated.View>
                );
              })}

              <Animated.View entering={enterRow(3 + TABLE_ORDER.length)}>
                <View style={styles.cardActions}>
                  <Pressable
                    onPress={() => {
                      hide();
                      card.onReview();
                    }}
                    style={[styles.btn, styles.btnGhost]}
                  >
                    <MaterialCommunityIcons
                      name="eye-outline"
                      size={18}
                      color={theme.text}
                    />
                    <Text style={styles.btnGhostText}>Review</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      hide();
                      card.onRematch();
                    }}
                    style={[styles.btn, styles.btnPrimary]}
                  >
                    <MaterialCommunityIcons
                      name="sword-cross"
                      size={18}
                      color={theme.bg}
                    />
                    <Text style={styles.btnPrimaryText}>Rematch</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </Animated.View>
          ) : null}
        </Animated.View>
      </View>
    </AuraContext.Provider>
  );
};

const HAIRLINE = StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  fill: { flex: 1 },

  cardWrap: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 40,
  },

  recapKicker: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.5,
  },
  recapTitle: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginTop: 5,
    marginBottom: 20,
  },

  avatar: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: HAIRLINE,
  },
  avatarYou: {
    backgroundColor: theme.boardLight,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarOpp: {
    backgroundColor: theme.surfaceHi,
    borderColor: theme.border,
  },
  avatarGlyph: {
    fontSize: 19,
    lineHeight: 23,
  },
  pillWin: {
    backgroundColor: theme.win,
  },

  // Shared 3-column grid: label/icon (flex) + two fixed player columns.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  rowLabel: {
    flex: 1,
    color: theme.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  cell: {
    width: 78,
    alignItems: 'center',
    gap: 6,
  },
  cellName: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 78,
  },
  pill: {
    width: 60,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: theme.text,
    alignItems: 'center',
  },
  pillText: {
    color: theme.bg,
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  tableDivider: {
    height: HAIRLINE,
    backgroundColor: 'rgba(240,242,245,0.12)',
    marginVertical: 16,
  },

  qRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  qLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  qIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qGlyph: {
    fontSize: 14,
    fontWeight: '800',
  },
  qLabel: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
  },
  qCount: {
    width: 78,
    textAlign: 'center',
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  qCountZero: {
    color: theme.textFaint,
    fontWeight: '500',
  },

  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  btnPrimary: {
    backgroundColor: theme.text,
  },
  btnPrimaryText: {
    color: theme.bg,
    fontSize: 16,
    fontWeight: '700',
  },
  btnGhost: {
    backgroundColor: 'rgba(240,242,245,0.08)',
    borderWidth: HAIRLINE,
    borderColor: 'rgba(240,242,245,0.16)',
  },
  btnGhostText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
