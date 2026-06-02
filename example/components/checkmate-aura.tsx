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
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
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
  for (float i = 0.0; i < 20.0; i += 1.0) {
    float t = (i + 0.5) / 20.0;
    float rad = sqrt(t) * r;          // sqrt ⇒ uniform area density
    float ang = i * 2.39996323;       // golden angle
    acc += image.eval(p + float2(cos(ang), sin(ang)) * rad).rgb;
  }
  return acc / 20.0;
}

half4 main(float2 position) {
  float2 toOrigin = position - u_origin;
  float dist = length(toOrigin);
  float2 dir = dist > 0.0001 ? toOrigin / dist : float2(0.0);

  float ang = atan(toOrigin.y, toOrigin.x);
  float wob =
    1.0 + u_wobble * (sin(ang * 3.0) * 0.6 + sin(ang * 2.0 + 1.7) * 0.4);

  float w = u_band;

  // Two beats off the one curve:
  //  1. GATHER (0 → ~0.30) — cold sparks spiral IN to the king. Board untouched
  //     so the origin is unmistakable before the wave releases.
  //  2. RELEASE (~0.24 → 1) — the shell bursts out and frosts the board.
  float gatherP = smoothstep(0.0, 0.30, u_progress);
  float gatherEnv =
    smoothstep(0.0, 0.14, u_progress) * (1.0 - smoothstep(0.26, 0.42, u_progress));
  float released = smoothstep(0.24, 0.36, u_progress);

  // The shell sweeps out from the king, wobbling slightly. The dead zone
  // before 0.22 is the charge beat; the crest only exists once released, so
  // there is no refraction blob sitting on the king at the start.
  float front = u_maxRadius * smoothstep(0.22, 1.0, u_progress) * wob;
  float x = dist - front;
  float shell = exp(-(x * x) / (2.0 * w * w)) * released;

  // Refraction rides the shell crest.
  float2 off = dir * (shell * u_amplitude);
  float2 ca = off * u_chroma;

  // Wake: how far behind the front this pixel is. Blur + tint ramp up over
  // the trailing region, so the board frosts over progressively as the wave
  // passes — not all at once. The blur depth itself breathes faintly (a slow
  // defocus) so the settled frost never feels frozen.
  float passed = clamp((front - dist) / (u_res.x * 0.6), 0.0, 1.0);
  float blurR = passed * (u_maxBlur + 2.5 * u_breath);

  // The board RECEDES as it frosts — sampled coords expand from centre, so the
  // image gently pulls back into depth behind the haze instead of sitting flat.
  float2 center = u_res * 0.5;
  float recede = 1.0 + 0.045 * smoothstep(0.2, 1.0, u_progress) * passed;
  float2 sp = center + (position - center) * recede + off;

  // Chromatic aberration at the shell crest: red and blue fan out in opposite
  // directions along the wavefront, so the travelling ring tears the board into
  // vivid RGB fringes as it passes.
  half3 g = blurSample(sp, blurR);
  half r = image.eval(sp + ca).r;
  half b = image.eval(sp - ca).b;
  half3 col = half3(
    mix(g.r, r, shell),
    g.g,
    mix(g.b, b, shell)
  );

  // Aurora the wake dissolves toward: the dark app background, lifted only
  // faintly toward a neutral glow on the king. The glow BREATHES — swelling in
  // both radius and brightness on the inhale, settling on the exhale — so the
  // backdrop reads as a slow living light, not a static tint.
  float md = max(u_res.x, u_res.y);
  float kd = dist / md;
  float falloff = mix(9.5, 6.2, u_breath);              // glow widens on inhale
  float kglow = exp(-kd * kd * falloff) * (0.5 + 0.5 * u_breath);
  half3 aurora = mix(half3(u_deep), half3(u_glow), clamp(kglow * 0.18, 0.0, 1.0));
  col = mix(col, aurora, passed * u_tint);
  // Faint full-field swell so the whole haze breathes, not only the core.
  col += half3(u_glow) * (0.008 * u_breath * passed);

  // --- Phase 1: the king's defeat — light collapses into a void ---
  // The board drains into the background around the king and a tight void core
  // opens at the origin (the "hole"), with only a faint cold ember at its
  // heart. The sparks fall into it.
  float shadowW = mix(w * 4.5, w * 2.2, gatherP);
  float shadow = exp(-(dist * dist) / (2.0 * shadowW * shadowW)) * gatherEnv;
  float voidW = mix(w * 1.3, w * 0.5, gatherP);
  float voidC = exp(-(dist * dist) / (2.0 * voidW * voidW)) * gatherEnv;
  float darkHole = clamp(shadow * 0.55 + voidC * 0.85, 0.0, 1.0);
  col = mix(col, half3(u_deep), darkHole);          // drain into the bg
  col += half3(u_glow) * (voidC * voidC * 0.3);     // faint ember at the core

  // --- The gather: cold sparks spiralling into the king ---
  float stars = 0.0;
  for (float i = 0.0; i < 40.0; i += 1.0) {
    float h = fract(sin(i * 12.9898) * 43758.5453);  // size / start / fall hash
    float h2 = fract(sin(i * 78.233) * 12543.731);   // speed / phase hash
    float startR = w * (0.5 + h * 1.5);              // scattered around the king
    float rr = clamp(gatherP * (0.6 + h * 0.9), 0.0, 1.0); // independent timing
    float r2 = mix(startR, w * 0.12, rr);
    // Independent angular speed per spark, accelerating as it falls in.
    float spd = 0.6 + h2 * 1.9;
    float spin = i * 2.39996 + h * 6.2831853 +
      (gatherP * 1.1 + gatherP * gatherP * 1.8) * spd;
    float2 pp = u_origin + float2(cos(spin), sin(spin)) * r2;
    float d2 = length(position - pp);
    float R = 1.9;                                   // crisp disc radius (pt)
    float core = smoothstep(R, R - 0.35, d2);
    float tw = 0.6 + 0.4 * sin(i * 7.0 + u_progress * 18.0 + h2 * 6.2831853);
    float swallow = smoothstep(w * 0.14, w * 0.7, r2); // wink out at the centre
    stars += core * (0.6 + 0.4 * h) * tw * swallow;
  }
  col += half3(u_spark) * (stars * gatherEnv * 1.1);

  // Implosion flash: a sharp pulse at the king the instant the collapse
  // completes and the shell launches — the energy releasing, fusing the
  // implosion and the sweep into one event.
  float flashT = (u_progress - 0.30) / 0.035;
  float flash = exp(-0.5 * flashT * flashT);
  float flashCore = exp(-(dist * dist) / (2.0 * (w * 0.85) * (w * 0.85)));
  col += half3(u_spark) * (flash * flashCore * 1.3);

  // Frosted grain.
  col += (hash(floor(position)) - 0.5) * 0.02;

  // Iridescent crest: a spectral rim whose hue sweeps around the ring (by
  // angle) and shifts as the wave travels (by radius), so the expanding shell
  // shimmers through the spectrum — the wave's only colour, against the dark.
  float phase = ang / 6.2831853 + dist / u_res.x * 1.5 + u_progress * 0.4;
  half3 irid = spectrum(phase);
  col += irid * (shell * u_glowStrength);

  // Cinematic vignette — the haze deepens toward the corners so it reads as a
  // lit volume with depth, not a flat grey panel. Only in the settled wake.
  float2 uvc = position / u_res - 0.5;
  float vig = 1.0 - smoothstep(0.5, 1.05, length(uvc) * 1.25);
  col *= mix(1.0, 0.72 + 0.28 * vig, passed);

  return half4(col, 1.0);
}
`;

const WAVE = Skia.RuntimeEffect.Make(WAVE_SKSL)!;

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
// Neutral cool-white glow — the haze recedes; only a faint light at the king.
// No accent hue, so the recap's red/green annotations carry the only colour.
const GLOW: [number, number, number] = [0.8, 0.85, 0.95];
// Near-black base the board sinks into, so the haze reads as a dark volume and
// the only colour is the iridescent wave crest (a touch below theme.bg).
const DEEP: [number, number, number] = [0.022, 0.026, 0.036];
// Bright cold spark for the gather — reads as light against the dark.
const SPARK: [number, number, number] = [0.78, 0.85, 1.0];

// The original ripple's timing: one continuous eased curve, ~4s — a moderate
// build through the first ~30% (the charge) that accelerates through the
// middle (the sweep) and decelerates at the end (easing to the screen edges).
const WAVE_MS = 4000;
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
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
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

// Cascades a child in off a shared 0→1 driver, staggered by index — each row
// of the recap lifts + fades a beat after the one above it.
const Stagger: React.FC<{
  t: SharedValue<number>;
  index: number;
  children: React.ReactNode;
}> = ({ t, index, children }) => {
  const style = useAnimatedStyle(() => {
    const start = index * 0.07;
    let e = (t.value - start) / 0.5;
    e = Math.max(0, Math.min(1, e));
    const ease = e * e * (3.0 - 2.0 * e); // smoothstep
    return { opacity: ease, transform: [{ translateY: (1 - ease) * 18 }] };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
};

export const CheckmateAuraProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { width, height } = useWindowDimensions();
  const rootRef = useRef<View>(null);
  const busy = useRef(false);

  const snapshot = useSharedValue<SkImage | null>(null);
  const progress = useSharedValue(0); // the shell sweeping out
  const breath = useSharedValue(0); // settled-glow breathing loop
  const vis = useSharedValue(0); // overlay opacity (show / hide)
  const recapT = useSharedValue(0); // recap cascade-in driver (0→1)
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
      ) * 1.08
    );
  });

  const uniforms = useDerivedValue(() => ({
    u_res: [width, height],
    u_origin: [origin.value.x, origin.value.y],
    u_progress: progress.value,
    u_maxRadius: maxRadius.value,
    u_band: 64,
    u_amplitude: 64,
    u_chroma: 0.5,
    u_glowStrength: 0.6,
    u_wobble: 0.04,
    u_maxBlur: 14,
    u_breath: breath.value,
    u_tint: 0.93,
    u_glow: GLOW,
    u_deep: DEEP,
    u_spark: SPARK,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: vis.value,
    pointerEvents: vis.value > 0.5 ? 'auto' : 'none',
  }));

  // Container just gates the recap with the overlay; the per-row Stagger
  // (driven by recapT) does the actual cascade-in.
  const cardStyle = useAnimatedStyle(() => ({ opacity: vis.value }));

  const clearCard = useCallback(() => setCard(null), []);

  // Free the snapshot + card once fully hidden.
  useAnimatedReaction(
    () => vis.value,
    (v, prev) => {
      if (prev !== null && prev > 0.01 && v <= 0.01) {
        snapshot.value = null;
        progress.value = 0;
        recapT.value = 0;
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
      const image = await makeImageFromView(rootRef);
      if (!image) {
        busy.current = false;
        return;
      }
      snapshot.value = image;
      setCard(opts);
      // Overlay covers instantly — at progress 0 it is identical to the live
      // board (invisible cut), then the wave sweeps the blur across it.
      vis.value = 1;
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: WAVE_MS,
        // Slow charge, decisive sweep, long soft settle — a weighted curve.
        easing: Easing.bezier(0.32, 0.0, 0.18, 1),
      });
      // Recap cascades in once the wave has swept most of the screen.
      recapT.value = 0;
      recapT.value = withDelay(
        Math.round(WAVE_MS * 0.5),
        withTiming(1, { duration: 1150, easing: Easing.out(Easing.cubic) })
      );
      // Slow breathing for the settled glow — shared value + withRepeat.
      breath.value = 0;
      breath.value = withRepeat(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    },
    [origin, snapshot, progress, recapT, breath, vis]
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
        {children}
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
              <Stagger t={recapT} index={0}>
                <Text style={styles.recapKicker}>GAME REVIEW</Text>
                <Text style={styles.recapTitle}>{card.subtitle}</Text>
              </Stagger>

              {/* Accuracy header: avatar + name + pill per player. */}
              <Stagger t={recapT} index={1}>
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
              </Stagger>

              <Stagger t={recapT} index={2}>
                <View style={styles.tableDivider} />
              </Stagger>

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
                  <Stagger key={q} t={recapT} index={3 + qi}>
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
                  </Stagger>
                );
              })}

              <Stagger t={recapT} index={3 + TABLE_ORDER.length}>
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
              </Stagger>
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
