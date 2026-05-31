import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  Skia,
  Canvas,
  Fill,
  Shader,
  ImageShader,
  makeImageFromView,
} from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { theme } from './theme';

// AirDrop-style glass bubble ripple over a captured snapshot. A soft shell
// expands from the origin: content is bent outward through a moving lens,
// chromatic aberration rides the shell (so it travels WITH the wave), a
// thin specular highlight catches the light, and a gentle non-circular
// wobble keeps it organic. Fades to the identity image before the overlay
// is removed (invisible cut).
//
// The overlay lives at the app root (above the navigator) so the wave
// covers the WHOLE window — including the native header — and works in
// plain window coordinates.
const RIPPLE_SKSL = `
uniform shader image;
uniform float2 u_origin;
uniform float u_progress;      // 0 → 1
uniform float u_maxRadius;     // how far the shell travels (px)
uniform float u_amplitude;     // outward refraction at the shell (px)
uniform float u_thickness;     // shell softness / thickness (px)
uniform float u_blur;          // radial blur radius at the shell (px)
uniform float u_chroma;        // chromatic split at the shell crest
uniform float3 u_glow;         // specular highlight colour (linear 0..1)
uniform float u_glowStrength;
uniform float u_wobble;        // non-circular wavefront amount (organic)
uniform float3 u_void;         // void colour = app background (seamless)

half4 main(float2 position) {
  float2 toOrigin = position - u_origin;
  float dist = length(toOrigin);
  float2 dir = dist > 0.0001 ? toOrigin / dist : float2(0.0);

  float ang = atan(toOrigin.y, toOrigin.x);
  float wob =
    1.0 + u_wobble * (sin(ang * 3.0) * 0.6 + sin(ang * 2.0 + 1.7) * 0.4);
  float w = u_thickness;

  // Two phases off the one (spring-driven) progress:
  //  1. GATHER — a cloud of bright specks spirals IN toward the king and
  //     collapses onto it. The board itself is untouched — just particles
  //     converging, so the origin is unmistakable before anything bursts.
  //  2. RELEASE — the glass shell bursts out and sweeps the screen.
  float gatherP = smoothstep(0.0, 0.30, u_progress); // specks fall 0→1
  float gatherEnv =
    smoothstep(0.0, 0.14, u_progress) *
    (1.0 - smoothstep(0.26, 0.40, u_progress)); // gradual fade-in, the build
  float released = smoothstep(0.24, 0.36, u_progress); // shell switches on
  float fade = 1.0 - smoothstep(0.62, 0.86, u_progress); // overall fade-out

  // Outward shell — radius expands only after the gather releases.
  float front = u_maxRadius * smoothstep(0.22, 1.0, u_progress) * wob;
  float x = dist - front;
  float shell = exp(-(x * x) / (2.0 * w * w)) * released * fade;

  // Clean refraction at the shell only — board is untouched during gather.
  float2 off = dir * (shell * u_amplitude);
  float2 ca = off * (u_chroma * shell);
  half4 cr = image.eval(position + off + ca);
  half4 cg = image.eval(position + off);
  half4 cb = image.eval(position + off - ca);
  half4 col = half4(cr.r, cg.g, cb.b, 1.0);

  // Gentle bloom so the lensed band reads as soft glass, not a hard edge.
  float blurR = shell * u_blur;
  half4 acc = col;
  for (float a = 0.0; a < 6.2831853; a += 1.5707963) {
    float2 sdir = float2(cos(a), sin(a));
    acc += image.eval(position + off + sdir * blurR);
  }
  col = mix(col, acc / 5.0, clamp(shell * 0.5, 0.0, 1.0));

  // --- Phase 1: the king's defeat — light collapses into a void ---
  // The board drains into shadow around the king while comet-streak sparks
  // are dragged IN and swallowed. A tight void core opens at the origin with
  // only a faint, cold ember at its heart. This reads as doom — the king has
  // lost — not as a bright celebratory charge.
  float shadowW = mix(w * 4.5, w * 2.2, gatherP); // shadow pool tightens
  float shadow = exp(-(dist * dist) / (2.0 * shadowW * shadowW)) * gatherEnv;
  float voidW = mix(w * 1.3, w * 0.5, gatherP); // void core tightens
  float voidC = exp(-(dist * dist) / (2.0 * voidW * voidW)) * gatherEnv;
  // Collapse toward the real app background (not pure black), so the board
  // dissolves seamlessly into the void — its centre becomes the app bg.
  float dark = clamp(shadow * 0.55 + voidC * 0.85, 0.0, 1.0);
  col.rgb = mix(col.rgb, half3(u_void), dark);
  col.rgb += half3(u_glow) * (voidC * voidC * 0.3); // faint ember at the core

  float stars = 0.0;
  for (float i = 0.0; i < 24.0; i += 1.0) {
    float h = fract(sin(i * 12.9898) * 43758.5453); // 0..1 hash
    float startR = w * (0.5 + h * 1.5); // scattered around the king
    float r = mix(startR, w * 0.12, gatherP); // drift slowly inward
    // Angular speed grows as the star falls inward (gatherP² term) — a calm
    // drift that spins up the closer it gets to the centre.
    float spin =
      i * 2.39996 + h * 6.2831853 + gatherP * 1.6 + gatherP * gatherP * 2.0;
    float2 pp = u_origin + float2(cos(spin), sin(spin)) * r;
    // Pure crisp disc — solid centre, razor rim. The feather is a fixed
    // ~0.35pt (≈1 device px at 3× DPR), NOT a wide smoothstep, so it reads
    // sharp. (fwidth is unavailable in RN-Skia runtime effects.) No halo.
    float d = length(position - pp);
    float R = 2.4; // disc radius in pt
    float core = smoothstep(R, R - 0.35, d); // ~1px crisp edge
    float tw = 0.55 + 0.45 * sin(i * 7.0 + u_progress * 20.0);
    float swallow = smoothstep(w * 0.16, w * 0.7, r); // wink out at the centre
    stars += core * (0.6 + 0.4 * h) * tw * swallow;
  }
  col.rgb += half3(u_glow) * (stars * gatherEnv * 1.1); // cold drifting stars

  // Implosion flash: a sharp bright pulse at the king the instant the collapse
  // completes and the shell launches — the energy releasing. This is the beat
  // that fuses the implosion and the explosion into one event.
  float flashT = (u_progress - 0.30) / 0.035;
  float flash = exp(-0.5 * flashT * flashT); // gaussian spike centred at 0.30
  float flashCore = exp(-(dist * dist) / (2.0 * (w * 0.85) * (w * 0.85)));
  col.rgb += half3(u_glow) * (flash * flashCore * 1.3);

  // Thin specular highlight riding the shell's leading edge.
  float rw = w * 0.42;
  float rim = exp(-(x * x) / (2.0 * rw * rw));
  col.rgb += half3(u_glow) * (rim * released * fade * u_glowStrength);
  return col;
}
`;

const RIPPLE_SHADER = Skia.RuntimeEffect.Make(RIPPLE_SKSL)!;
// Progress runs as ONE continuous eased curve, 0 → 1 — no segment seam, so
// there's no velocity jump between the charge and the burst. The sigmoid
// (ease-inOut) gives a moderate build through the first ~30% (the void
// collapse / charge) that accelerates through the middle (the burst erupting)
// and decelerates at the end (the shell easing to the screen edges).
const RIPPLE_MS = 4000;
// The wave is visually finished by this progress; the overlay is torn down
// here so the spring's slow asymptotic tail never freezes the frame.
const VISIBLE_UNTIL = 0.86;
// Cold blue glow — menace, not celebration (the king has lost).
const RING_GLOW: [number, number, number] = [0.55, 0.68, 1.0];
// Void colour = the app background, so the collapse dissolves into the bg
// seamlessly instead of crushing to pure black.
const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const VOID_COLOR = hexToRgb(theme.bg);

type RippleApi = { fire: (x: number, y: number) => void };
const RippleContext = createContext<RippleApi>({ fire: () => {} });
export const useRipple = () => useContext(RippleContext);

// Wraps the app: captures the whole window on `fire(x, y)` and sweeps the
// glass wave out from that (window-space) point, over everything.
export const RippleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { width, height } = useWindowDimensions();
  const rootRef = useRef<View>(null);
  const busy = useRef(false);

  const snapshot = useSharedValue<SkImage | null>(null);
  const progress = useSharedValue(0);
  const origin = useSharedValue({ x: 0, y: 0 });
  const done = useSharedValue(false); // guards the one-shot unmount

  // Stable JS-thread callback for scheduleOnRN — passing an inline arrow
  // created inside the worklet aborts the worklet runtime. The Canvas stays
  // mounted; we only need to free the busy latch once the wave has faded.
  const release = useCallback(() => {
    busy.current = false;
  }, []);

  // Tear the overlay down the moment the wave has faded (well before the
  // spring fully settles), so the frozen snapshot never lingers.
  useAnimatedReaction(
    () => progress.value,
    (p) => {
      if (p >= VISIBLE_UNTIL && !done.value) {
        done.value = true;
        scheduleOnRN(release);
      }
    }
  );

  const uniforms = useDerivedValue(() => {
    const ox = origin.value.x;
    const oy = origin.value.y;
    const maxRadius =
      Math.max(
        Math.hypot(ox, oy),
        Math.hypot(width - ox, oy),
        Math.hypot(ox, height - oy),
        Math.hypot(width - ox, height - oy)
      ) * 1.05;
    return {
      u_origin: [ox, oy],
      u_progress: progress.value,
      u_maxRadius: maxRadius,
      u_amplitude: 46,
      u_thickness: 48,
      u_blur: 10,
      u_chroma: 0.45,
      u_glow: RING_GLOW,
      u_glowStrength: 0.35,
      u_wobble: 0.05,
      u_void: VOID_COLOR,
    };
  });

  // Canvas stays permanently mounted; we only toggle opacity + pointerEvents
  // off the shared `progress`, so there's no state-driven remount and no
  // mounted Skia canvas swallowing touches while idle (pointerEvents 'none').
  const overlayStyle = useAnimatedStyle(() => {
    const visible = progress.value > 0 && progress.value < VISIBLE_UNTIL;
    return {
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'auto' : 'none',
    };
  });

  const fire = useCallback(
    async (x: number, y: number) => {
      if (busy.current) return;
      busy.current = true;
      origin.value = { x, y };
      const image = await makeImageFromView(rootRef);
      if (!image) {
        busy.current = false;
        return;
      }
      snapshot.value = image;
      done.value = false;
      progress.value = 0;
      // One continuous curve, no seam. Initial slope ≈ 1 (linear-ish) so the
      // charge MOVES from frame one — no dead start — then it accelerates
      // through the middle (the burst) and eases to a stop at the edges.
      progress.value = withTiming(1, {
        duration: RIPPLE_MS,
        easing: Easing.bezier(0.25, 0.25, 0.35, 1),
      });
    },
    [origin, snapshot, progress, done]
  );

  const api = useMemo(() => ({ fire }), [fire]);

  return (
    <RippleContext.Provider value={api}>
      <View ref={rootRef} collapsable={false} style={styles.fill}>
        {children}
        <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
          <Canvas style={styles.fill}>
            <Fill>
              <Shader source={RIPPLE_SHADER} uniforms={uniforms}>
                <ImageShader
                  image={snapshot}
                  fit="cover"
                  width={width}
                  height={height}
                />
              </Shader>
            </Fill>
          </Canvas>
        </Animated.View>
      </View>
    </RippleContext.Provider>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
