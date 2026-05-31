import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
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
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

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

half4 main(float2 position) {
  float2 toOrigin = position - u_origin;
  float dist = length(toOrigin);
  float2 dir = dist > 0.0001 ? toOrigin / dist : float2(0.0);

  // Wavefront radius — linear in progress; the critically-damped spring
  // driving progress gives the slow build then ease. A gentle angular
  // wobble breaks the perfect circle so it reads hand-made, not machine.
  float ang = atan(toOrigin.y, toOrigin.x);
  float wob =
    1.0 + u_wobble * (sin(ang * 3.0) * 0.6 + sin(ang * 2.0 + 1.7) * 0.4);
  float front = u_maxRadius * u_progress * wob;

  // Fade fully out by ~0.86 (where the overlay unmounts), so the cut is
  // invisible and the spring's slow tail never shows a frozen frame.
  float life = 1.0 - smoothstep(0.5, 0.86, u_progress);

  // One soft glass swell at the wavefront — a wide, smooth lens.
  float x = dist - front;
  float w = u_thickness;
  float shell = exp(-(x * x) / (2.0 * w * w)) * life;

  // Clean refraction: bend the image outward through the moving lens.
  float2 off = dir * (shell * u_amplitude);

  // Chromatic aberration rides the shell ONLY, so it travels outward with
  // the wave instead of tinting the whole frame the instant it appears.
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

  // Thin specular highlight riding the leading edge — glass catching light.
  float rw = w * 0.42;
  float rim = exp(-(x * x) / (2.0 * rw * rw));
  col.rgb += half3(u_glow) * (rim * life * u_glowStrength);
  return col;
}
`;

const RIPPLE_SHADER = Skia.RuntimeEffect.Make(RIPPLE_SKSL)!;
const RIPPLE_DURATION_MS = 3200;
// The wave is visually finished by this progress; the overlay is torn down
// here so the spring's slow asymptotic tail never freezes the frame.
const VISIBLE_UNTIL = 0.86;
// Cool near-white specular highlight colour (glass catching light).
const RING_GLOW: [number, number, number] = [0.82, 0.9, 1.0];

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
  // Overlay is mounted ONLY while the wave plays — a permanently-mounted
  // full-screen Skia canvas swallows touches even with pointerEvents none.
  const [active, setActive] = useState(false);

  const snapshot = useSharedValue<SkImage | null>(null);
  const progress = useSharedValue(0);
  const origin = useSharedValue({ x: 0, y: 0 });
  const done = useSharedValue(false); // guards the one-shot unmount

  // Stable JS-thread callback for scheduleOnRN — passing an inline arrow
  // created inside the worklet aborts the worklet runtime.
  const release = useCallback(() => {
    busy.current = false;
    snapshot.value = null;
    setActive(false);
  }, [snapshot]);

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
    };
  });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: progress.value > 0 && progress.value < 1 ? 1 : 0,
  }));

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
      setActive(true);
      done.value = false;
      progress.value = 0;
      // Critically damped spring (ζ=1): slow build, accelerate, settle with
      // no overshoot. The reaction above unmounts once the wave has faded.
      progress.value = withSpring(1, {
        duration: RIPPLE_DURATION_MS,
        dampingRatio: 1,
      });
    },
    [origin, snapshot, progress, done]
  );

  const api = useMemo(() => ({ fire }), [fire]);

  return (
    <RippleContext.Provider value={api}>
      <View ref={rootRef} collapsable={false} style={styles.fill}>
        {children}
        {active ? (
          <Animated.View
            style={[StyleSheet.absoluteFill, overlayStyle, styles.noTouch]}
            pointerEvents="none"
          >
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
        ) : null}
      </View>
    </RippleContext.Provider>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  noTouch: { pointerEvents: 'none' },
});
