import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
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
import Animated, {
  useDerivedValue,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Chessboard, { ChessboardRef, MoveResult } from 'react-native-chessboard';

type Color = 'w' | 'b';

// AirDrop-style sonar burst over a captured snapshot of the whole screen.
// A set of thin concentric rings emanate from the origin (the king) and
// glide outward, fading as they go — the trailing rings dimmer than the
// leading edge. Each ring adds an emissive, near-white accent glow and a
// tiny radial refraction (just enough to feel like a wave passing, not a
// warp). Everything fades to the identity image before the overlay is
// removed (invisible cut).
// AirDrop-style bubble ripple over a captured snapshot (after the
// dkun7944 iOS-17 shader). A soft shell expands from the origin (the
// king): content is shoved outward where it passes (a refraction bulge),
// the wavefront is radial-blurred so it reads like a glassy bubble
// surface, a chromatic fringe rides the crest, and a bright blue-white
// light flares on the shell. Trailing shell adds a second ripple. Fades
// to the identity image before the overlay is removed (invisible cut).
const RIPPLE_SKSL = `
uniform shader image;
uniform float2 u_origin;
uniform float u_progress;      // 0 → 1
uniform float u_maxRadius;     // how far the shell travels (px)
uniform float u_amplitude;     // outward refraction at the shell (px)
uniform float u_thickness;     // shell softness / thickness (px)
uniform float u_blur;          // radial blur radius at the shell (px)
uniform float u_chroma;        // chromatic split strength
uniform float3 u_glow;         // shell glow colour (linear 0..1)
uniform float u_glowStrength;

half4 main(float2 position) {
  float2 toOrigin = position - u_origin;
  float dist = length(toOrigin);
  float2 dir = dist > 0.0001 ? toOrigin / dist : float2(0.0);

  // Shell radius — fast burst then ease-out, like a bubble blowing out.
  float front = u_maxRadius * (1.0 - pow(1.0 - u_progress, 1.7));
  float life = 1.0 - smoothstep(0.7, 1.0, u_progress);

  // Leading shell + a dimmer trailing shell → a two-ring ripple.
  float x0 = dist - front;
  float x1 = dist - (front - u_thickness * 2.4);
  float t2 = u_thickness * u_thickness;
  float shell =
    exp(-(x0 * x0) / (2.0 * t2)) +
    0.5 * exp(-(x1 * x1) / (2.0 * t2));
  shell *= life;

  // Outward refraction where the shell passes (the bubble bulge).
  float2 off = dir * (shell * u_amplitude);

  // Strong chromatic aberration: sample R / G / B at different
  // displacement magnitudes along the radial push, so the wavefront
  // leaves a vivid rainbow fringe — glassy, like curved glass.
  float sep = u_chroma * shell;
  half4 cr = image.eval(position + off * (1.0 + sep));
  half4 cg = image.eval(position + off);
  half4 cb = image.eval(position + off * (1.0 - sep));
  half4 col = half4(cr.r, cg.g, cb.b, 1.0);

  // Soft radial bloom on the crest only — the glassy bubble surface,
  // kept light so it doesn't wash out the chromatic fringe.
  float blurR = shell * u_blur;
  half4 acc = col;
  for (float a = 0.0; a < 6.2831853; a += 1.5707963) {
    float2 sdir = float2(cos(a), sin(a));
    acc += image.eval(position + off + sdir * blurR);
  }
  col = mix(col, acc / 5.0, shell * 0.5);

  // Bright blue-white light flaring on the shell.
  col.rgb += half3(u_glow) * (shell * u_glowStrength);
  return col;
}
`;

const RIPPLE_SHADER = Skia.RuntimeEffect.Make(RIPPLE_SKSL)!;
const RIPPLE_DURATION_MS = 2400;

// Cool blue-white ring glow, AirDrop-like, independent of game state.
const RING_GLOW: [number, number, number] = [0.66, 0.84, 1.0];

// Status → accent. Drives the pill tint and the live-dot colour so the
// whole chrome shifts with the game state, mirroring the board shader.
const STATUS_ACCENT: Record<string, string> = {
  Checkmate: '#E84855',
  Check: '#F2C14E',
  Stalemate: '#7FA8E8',
};
const accentFor = (status: string) => STATUS_ACCENT[status] ?? '#62B1A8';

const LiveDot: React.FC<{ color: string }> = ({ color }) => {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.5 - pulse.value * 0.4,
    transform: [{ scale: 1 + pulse.value * 1.6 }],
  }));
  return (
    <View style={styles.liveDotWrap}>
      <Animated.View
        style={[styles.liveHalo, { backgroundColor: color }, haloStyle]}
      />
      <View style={[styles.liveDot, { backgroundColor: color }]} />
    </View>
  );
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Measure a view's frame in window (screen) coordinates, as a promise.
const measureInWindow = (
  ref: React.RefObject<View | null>
): Promise<{ x: number; y: number; width: number; height: number } | null> =>
  new Promise((resolve) => {
    const node = ref.current;
    if (!node) return resolve(null);
    node.measureInWindow((x, y, width, height) =>
      resolve({ x, y, width, height })
    );
  });

// Locate a king on the board from the FEN placement field. Returns the
// 0-based file (a→0) and row-from-top (rank 8 → 0), matching the board's
// internal squareToIndex convention before any flip is applied.
const kingFromFen = (
  fen: string,
  color: Color
): { file: number; rowFromTop: number } | null => {
  const placement = fen.split(' ')[0];
  const ranks = placement.split('/'); // ranks[0] = rank 8 = top row
  const target = color === 'w' ? 'K' : 'k';
  for (let row = 0; row < ranks.length; row++) {
    let file = 0;
    for (const ch of ranks[row]) {
      if (ch >= '1' && ch <= '9') {
        file += parseInt(ch, 10);
      } else {
        if (ch === target) return { file, rowFromTop: row };
        file += 1;
      }
    }
  }
  return null;
};

const FOOLS_MATE: Array<[string, string]> = [
  ['f2', 'f3'],
  ['e7', 'e5'],
  ['g2', 'g4'],
  ['d8', 'h4'],
];

export default function App() {
  const ref = useRef<ChessboardRef>(null);
  const rootRef = useRef<View>(null);
  const boardBoxRef = useRef<View>(null);
  const runningRef = useRef(false);
  const rippleBusy = useRef(false);

  const [status, setStatus] = useState('White to move');
  const [moves, setMoves] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);
  const { width, height } = useWindowDimensions();
  const boardSize = Math.min(width - 48, 380);
  const pieceSize = boardSize / 8;
  const accent = accentFor(status);

  // Full-screen ripple state, all driven on the UI thread.
  const snapshot = useSharedValue<SkImage | null>(null);
  const progress = useSharedValue(0);
  const origin = useSharedValue({ x: 0, y: 0 });

  const uniforms = useDerivedValue(() => {
    // Size the travel to the farthest screen corner from the origin, so
    // the shell sweeps the whole screen over the animation and exits just
    // as it fades — not in the first 40% (which an oversized radius does).
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
      u_amplitude: 42,
      u_thickness: 36,
      u_blur: 12,
      u_chroma: 0.55,
      u_glow: RING_GLOW,
      u_glowStrength: 0.7,
    };
  });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: progress.value > 0 && progress.value < 1 ? 1 : 0,
  }));

  // Press feedback for the primary control, driven on the UI thread.
  const replayScale = useSharedValue(1);
  const replayStyle = useAnimatedStyle(() => ({
    transform: [{ scale: replayScale.value }],
  }));

  const releaseRipple = useCallback(() => {
    rippleBusy.current = false;
  }, []);

  // Snapshot the whole screen and run the ripple out from the king that
  // just changed state. Origin is the king square in window coordinates:
  // the board's measured top-left plus the square's local pixel centre.
  const fireRipple = useCallback(
    async (fen: string, moverColor: Color) => {
      if (rippleBusy.current) return;
      const kingColor: Color = moverColor === 'w' ? 'b' : 'w';
      const king = kingFromFen(fen, kingColor);
      if (!king) return;
      rippleBusy.current = true;

      const box = await measureInWindow(boardBoxRef);
      if (!box) return releaseRipple();
      const col = flipped ? 7 - king.file : king.file;
      const row = flipped ? 7 - king.rowFromTop : king.rowFromTop;
      origin.value = {
        x: box.x + col * pieceSize + pieceSize / 2,
        y: box.y + row * pieceSize + pieceSize / 2,
      };

      const image = await makeImageFromView(rootRef);
      if (!image) return releaseRipple();
      snapshot.value = image;
      progress.value = 0;
      progress.value = withTiming(
        1,
        { duration: RIPPLE_DURATION_MS, easing: Easing.linear },
        (finished) => {
          'worklet';
          if (finished) {
            snapshot.value = null;
            scheduleOnRN(releaseRipple);
          }
        }
      );
    },
    [flipped, pieceSize, origin, snapshot, progress, releaseRipple]
  );

  const handleMove = useCallback(
    (result: MoveResult) => {
      setMoves((prev) => [...prev, result.move.san]);
      const { isCheckmate, isStalemate, isCheck } = result.state;
      const nextStatus = isCheckmate
        ? 'Checkmate'
        : isStalemate
        ? 'Stalemate'
        : isCheck
        ? 'Check'
        : result.move.color === 'w'
        ? 'Black to move'
        : 'White to move';
      setStatus(nextStatus);

      if (isCheckmate || isStalemate || isCheck) {
        // Wait out the move spring (stiffness 400, critically damped →
        // ~300ms to settle) so the captured frame shows the piece landed.
        setTimeout(() => fireRipple(result.state.fen, result.move.color), 480);
      }
    },
    [fireRipple]
  );

  const playSequence = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    ref.current?.resetBoard();
    setMoves([]);
    setStatus('White to move');
    snapshot.value = null;
    progress.value = 0;
    rippleBusy.current = false;
    await delay(700);
    for (const [from, to] of FOOLS_MATE) {
      await ref.current?.move({ from: from as any, to: to as any });
      await delay(450);
    }
    runningRef.current = false;
  }, [snapshot, progress]);

  useEffect(() => {
    playSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group SAN into numbered "1. f3 e5" tokens for the history strip.
  const moveTokens: { no: number; white: string; black?: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    moveTokens.push({ no: i / 2 + 1, white: moves[i], black: moves[i + 1] });
  }

  return (
    <View style={styles.root}>
      {/* Snapshot target — everything the full-screen ripple distorts. */}
      <View ref={rootRef} collapsable={false} style={styles.fill}>
        <StatusBar style="light" />

        <View style={styles.content}>
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={[styles.glass, styles.header]}
          >
            <View style={styles.headerLeft}>
              <View style={[styles.glyphChip, { borderColor: accent + '55' }]}>
                <Text style={[styles.glyph, { color: accent }]}>♞</Text>
              </View>
              <View>
                <Text style={styles.brand}>react-native-chessboard</Text>
                <Text style={styles.brandSub}>Skia · Reanimated</Text>
              </View>
            </View>
            <View style={styles.liveBadge}>
              <LiveDot color={accent} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeIn.delay(150).duration(700)}
            style={styles.titleBlock}
          >
            <Text style={styles.eyebrow}>FAMOUS GAME</Text>
            <Text style={styles.title}>Fool’s Mate</Text>
            <Animated.View
              key={status}
              entering={FadeInDown.duration(350)}
              style={[
                styles.statusPill,
                { borderColor: accent + '66', backgroundColor: accent + '1f' },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: accent }]} />
              <Text style={[styles.statusText, { color: accent }]}>
                {status}
              </Text>
            </Animated.View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(250).duration(700)}
            style={styles.boardHero}
          >
            <View style={styles.boardFrame}>
              <View ref={boardBoxRef} collapsable={false}>
                <Chessboard
                  ref={ref}
                  boardSize={boardSize}
                  flipped={flipped}
                  onMove={handleMove}
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(350).duration(700)}
            style={[styles.glass, styles.historyCard]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.historyRow}
            >
              {moveTokens.length === 0 ? (
                <Text style={styles.historyEmpty}>Awaiting first move…</Text>
              ) : (
                moveTokens.map((t) => (
                  <View key={t.no} style={styles.moveToken}>
                    <Text style={styles.moveNo}>{t.no}.</Text>
                    <Text style={styles.moveSan}>{t.white}</Text>
                    {t.black ? (
                      <Text style={styles.moveSan}>{t.black}</Text>
                    ) : null}
                  </View>
                ))
              )}
            </ScrollView>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(450).duration(700)}
            style={styles.controls}
          >
            <Animated.View style={[styles.replayWrap, replayStyle]}>
              <Pressable
                onPressIn={() => {
                  replayScale.value = withTiming(0.96, { duration: 90 });
                }}
                onPressOut={() => {
                  replayScale.value = withDelay(
                    40,
                    withTiming(1, { duration: 140 })
                  );
                }}
                onPress={playSequence}
                style={[styles.glass, styles.replayButton]}
              >
                <Text style={styles.replayGlyph}>⟲</Text>
                <Text style={styles.replayText}>Replay</Text>
              </Pressable>
            </Animated.View>

            <Pressable
              onPress={() => setFlipped((f) => !f)}
              style={({ pressed }) => [
                styles.glass,
                styles.flipButton,
                pressed && styles.flipButtonPressed,
              ]}
            >
              <Text style={styles.flipGlyph}>⇅</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>

      {/* Full-screen ripple: the captured frame, refracted edge-to-edge.
          Only painted while the wave is in flight. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, overlayStyle]}
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
    </View>
  );
}

const GLASS_BORDER = 'rgba(255,255,255,0.10)';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020203',
  },
  fill: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Shared frosted-card base.
  glass: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_BORDER,
    borderRadius: 20,
  },

  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  glyphChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  glyph: {
    fontSize: 22,
    lineHeight: 26,
  },
  brand: {
    color: '#f5f5f7',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  brandSub: {
    color: '#6c6c80',
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 4,
  },
  liveDotWrap: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  liveText: {
    color: '#9a9aae',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  titleBlock: {
    alignItems: 'center',
    gap: 10,
  },
  eyebrow: {
    color: '#6c6c80',
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: '700',
  },
  title: {
    color: '#f5f5f7',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  boardHero: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardFrame: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.55,
    shadowRadius: 40,
  },

  historyCard: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
  },
  historyRow: {
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 16,
  },
  historyEmpty: {
    color: '#5a5a6e',
    fontSize: 13,
    fontStyle: 'italic',
  },
  moveToken: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  moveNo: {
    color: '#5a5a6e',
    fontSize: 13,
    fontWeight: '600',
  },
  moveSan: {
    color: '#d8d8e0',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  controls: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  replayWrap: {
    flex: 1,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  replayGlyph: {
    color: '#f5f5f7',
    fontSize: 18,
    fontWeight: '700',
  },
  replayText: {
    color: '#f5f5f7',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  flipButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    transform: [{ scale: 0.96 }],
  },
  flipGlyph: {
    color: '#d8d8e0',
    fontSize: 20,
    fontWeight: '700',
  },
});
