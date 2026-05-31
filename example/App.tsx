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
  withSpring,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Chessboard, { ChessboardRef, MoveResult } from 'react-native-chessboard';

type Color = 'w' | 'b';

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
uniform float u_chroma;        // chromatic split at the shell crest
uniform float u_baseChroma;    // steady radial chromatic split (per px)
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
  float wob = 1.0 + u_wobble * (sin(ang * 3.0) * 0.6 + sin(ang * 2.0 + 1.7) * 0.4);
  float front = u_maxRadius * u_progress * wob;

  // Long, gentle fade-out so the glass dissolves rather than snapping.
  float life = 1.0 - smoothstep(0.55, 1.0, u_progress);

  // One soft glass swell at the wavefront — a wide, smooth lens, not a
  // thin funky ring.
  float x = dist - front;
  float w = u_thickness;
  float shell = exp(-(x * x) / (2.0 * w * w)) * life;

  // Clean refraction: bend the image outward through the moving lens.
  float2 off = dir * (shell * u_amplitude);

  // Very subtle chromatic aberration — just edge realism, no rainbow.
  float2 caBase = dir * (u_baseChroma * dist * life);
  float2 caShell = off * (u_chroma * shell);
  float2 ca = caBase + caShell;
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

  // Thin specular highlight riding the leading edge — glass catching the
  // light, not a coloured glow flare. Narrower than the lens band.
  float rw = w * 0.42;
  float rim = exp(-(x * x) / (2.0 * rw * rw));
  col.rgb += half3(u_glow) * (rim * life * u_glowStrength);
  return col;
}
`;

const RIPPLE_SHADER = Skia.RuntimeEffect.Make(RIPPLE_SKSL)!;
const RIPPLE_DURATION_MS = 3200;

// Cool near-white specular highlight colour (glass catching light).
const RING_GLOW: [number, number, number] = [0.82, 0.9, 1.0];

// Status → accent. Drives the pill tint and the live-dot colour so the
// whole chrome shifts with the game state, mirroring the board shader.
const STATUS_ACCENT: Record<string, string> = {
  Checkmate: '#E84855',
  Check: '#F2C14E',
  Stalemate: '#7FA8E8',
};
const accentFor = (status: string) => STATUS_ACCENT[status] ?? '#62B1A8';

// The two players shown above and below the board.
type Side = 'w' | 'b';
const PLAYERS: Record<Side, { name: string; rating: number }> = {
  b: { name: 'nimzoknight', rating: 2218 },
  w: { name: 'you', rating: 2190 },
};

// Solid glyphs per colour, indexed by piece type — used in capture trays.
const GLYPH: Record<Side, Record<string, string>> = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

// Captured pieces a player has taken (opponent-coloured), plus the running
// material advantage when ahead.
const CaptureTray: React.FC<{ pieces: string[]; lead: number; foe: Side }> = ({
  pieces,
  lead,
  foe,
}) => (
  <View style={styles.tray}>
    {pieces.length > 0 ? (
      <Text style={styles.trayPieces}>
        {pieces.map((p) => GLYPH[foe][p]).join('')}
      </Text>
    ) : null}
    {lead > 0 ? <Text style={styles.trayLead}>+{lead}</Text> : null}
  </View>
);

const PlayerCard: React.FC<{
  side: Side;
  captured: string[];
  lead: number;
  toMove: boolean;
  clock: string;
  result?: 'win' | 'lose' | null;
}> = ({ side, captured, lead, toMove, clock, result }) => {
  const { name, rating } = PLAYERS[side];
  const foe: Side = side === 'w' ? 'b' : 'w';
  return (
    <View style={[styles.player, toMove && styles.playerActive]}>
      <View
        style={[styles.avatar, side === 'w' ? styles.avatarW : styles.avatarB]}
      >
        <Text style={styles.avatarGlyph}>{GLYPH[side].k}</Text>
      </View>
      <View style={styles.playerInfo}>
        <View style={styles.playerNameRow}>
          <Text style={styles.playerName}>{name}</Text>
          <Text style={styles.playerRating}>{rating}</Text>
          {result ? (
            <Text
              style={[
                styles.resultTag,
                result === 'win' ? styles.resultWin : styles.resultLose,
              ]}
            >
              {result === 'win' ? 'WON' : 'LOST'}
            </Text>
          ) : null}
        </View>
        <CaptureTray pieces={captured} lead={lead} foe={foe} />
      </View>
      <View style={[styles.clock, toMove && styles.clockActive]}>
        {toMove ? <View style={styles.clockDot} /> : null}
        <Text style={[styles.clockText, toMove && styles.clockTextActive]}>
          {clock}
        </Text>
      </View>
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
  const [captured, setCaptured] = useState<{ w: string[]; b: string[] }>({
    w: [],
    b: [],
  });
  const [flipped, setFlipped] = useState(false);
  const { width, height } = useWindowDimensions();
  // Board spans the full screen width — the hero of the screen.
  const boardSize = width;
  const pieceSize = boardSize / 8;
  const accent = accentFor(status);

  // One mount entrance: the board settles in (subtle scale + fade) while
  // the chrome eases in around it — no long staggered cascade.
  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
  }, [intro]);
  const boardIntro = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ scale: 0.965 + intro.value * 0.035 }],
  }));

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
      u_amplitude: 46,
      u_thickness: 48,
      u_blur: 10,
      u_chroma: 0.16,
      u_baseChroma: 0.005,
      u_glow: RING_GLOW,
      u_glowStrength: 0.35,
      u_wobble: 0.05,
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
      // Critically damped spring (ζ=1): starts slow, accelerates, settles
      // with no overshoot — so the shell builds then bursts outward.
      progress.value = withSpring(
        1,
        { duration: RIPPLE_DURATION_MS, dampingRatio: 1 },
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
      const taken = (result.move as { captured?: string }).captured;
      if (taken) {
        const by = result.move.color as Side;
        setCaptured((prev) => ({ ...prev, [by]: [...prev[by], taken] }));
      }
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
    setCaptured({ w: [], b: [] });
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

  // Derived game info for the player cards.
  const gameOver = status === 'Checkmate' || status === 'Stalemate';
  const turn: Side | null = gameOver
    ? null
    : moves.length % 2 === 0
    ? 'w'
    : 'b';
  const matW = captured.w.reduce((s, p) => s + (VALUE[p] ?? 0), 0);
  const matB = captured.b.reduce((s, p) => s + (VALUE[p] ?? 0), 0);
  const leadW = Math.max(0, matW - matB);
  const leadB = Math.max(0, matB - matW);
  // On checkmate the side to move is the one mated; the mover wins.
  const matedSide: Side | null =
    status === 'Checkmate' ? (moves.length % 2 === 0 ? 'w' : 'b') : null;
  const resultFor = (s: Side): 'win' | 'lose' | null =>
    matedSide ? (matedSide === s ? 'lose' : 'win') : null;

  return (
    <View style={styles.root}>
      {/* Snapshot target — everything the full-screen ripple distorts. */}
      <View ref={rootRef} collapsable={false} style={styles.fill}>
        <StatusBar style="light" />

        <View style={styles.content}>
          {/* Nav bar */}
          <Animated.View entering={FadeIn.duration(450)} style={styles.nav}>
            <Pressable hitSlop={12} style={styles.navBtn}>
              <Text style={styles.navChevron}>‹</Text>
            </Pressable>
            <View style={styles.navTitleWrap}>
              <Text style={styles.navTitle}>Fool’s Mate</Text>
              <Text
                style={[
                  styles.navSub,
                  STATUS_ACCENT[status] && { color: accent },
                ]}
              >
                {gameOver ? status : `${status} · 3+2 blitz`}
              </Text>
            </View>
            <Pressable
              hitSlop={12}
              onPress={() => setFlipped((f) => !f)}
              style={styles.navBtn}
            >
              <Text style={styles.navIcon}>⇅</Text>
            </Pressable>
          </Animated.View>

          <View style={styles.stage}>
            {/* Opponent (black) — top */}
            <Animated.View
              entering={FadeInDown.duration(480)}
              style={styles.playerWrap}
            >
              <PlayerCard
                side="b"
                captured={captured.b}
                lead={leadB}
                toMove={turn === 'b'}
                clock="2:46"
                result={resultFor('b')}
              />
            </Animated.View>

            {/* Full-bleed board — settles in on mount. */}
            <Animated.View style={[styles.boardHero, boardIntro]}>
              <View ref={boardBoxRef} collapsable={false}>
                <Chessboard
                  ref={ref}
                  boardSize={boardSize}
                  flipped={flipped}
                  onMove={handleMove}
                />
              </View>
            </Animated.View>

            {/* You (white) — bottom */}
            <Animated.View
              entering={FadeInUp.duration(480)}
              style={styles.playerWrap}
            >
              <PlayerCard
                side="w"
                captured={captured.w}
                lead={leadW}
                toMove={turn === 'w'}
                clock="3:09"
                result={resultFor('w')}
              />
            </Animated.View>
          </View>

          {/* Move history + replay */}
          <Animated.View
            entering={FadeIn.delay(140).duration(450)}
            style={styles.footer}
          >
            <View style={[styles.glass, styles.historyCard]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.historyRow}
              >
                {moveTokens.length === 0 ? (
                  <Text style={styles.historyEmpty}>No moves yet</Text>
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
            </View>

            <Animated.View style={replayStyle}>
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
                style={styles.replayButton}
              >
                <Text style={styles.replayGlyph}>⟲</Text>
                <Text style={styles.replayText}>Replay game</Text>
              </Pressable>
            </Animated.View>
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
    backgroundColor: '#0b0b0f',
  },
  fill: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },

  glass: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_BORDER,
    borderRadius: 14,
  },

  // Nav bar
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    paddingHorizontal: 14,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navChevron: {
    color: '#c8c8d2',
    fontSize: 30,
    fontWeight: '500',
    marginTop: -4,
  },
  navIcon: {
    color: '#c8c8d2',
    fontSize: 19,
    fontWeight: '700',
  },
  navTitleWrap: {
    alignItems: 'center',
  },
  navTitle: {
    color: '#f5f5f7',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  navSub: {
    color: '#7a7a8c',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  // Board + players
  stage: {
    alignItems: 'center',
    gap: 12,
  },
  boardHero: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Player row
  playerWrap: {
    width: '100%',
    paddingHorizontal: 14,
  },
  player: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  playerActive: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarW: {
    backgroundColor: '#e9e9ef',
    borderColor: '#ffffff',
  },
  avatarB: {
    backgroundColor: '#26262e',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  avatarGlyph: {
    fontSize: 24,
    lineHeight: 28,
  },
  playerInfo: {
    flex: 1,
    gap: 3,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerName: {
    color: '#f1f1f5',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  playerRating: {
    color: '#7a7a8c',
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  resultTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    overflow: 'hidden',
  },
  resultWin: {
    color: '#7fe0a0',
    backgroundColor: 'rgba(95,207,128,0.16)',
  },
  resultLose: {
    color: '#f08098',
    backgroundColor: 'rgba(232,101,122,0.16)',
  },
  tray: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 16,
  },
  trayPieces: {
    color: '#b4b4c0',
    fontSize: 15,
    lineHeight: 17,
  },
  trayLead: {
    color: '#8a8a9a',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  clock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  clockActive: {
    backgroundColor: 'rgba(95,207,128,0.16)',
  },
  clockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5fcf80',
  },
  clockText: {
    color: '#9a9aa8',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  clockTextActive: {
    color: '#eafff0',
  },

  // Footer: move history + replay
  footer: {
    gap: 12,
    paddingHorizontal: 14,
  },
  historyCard: {
    height: 42,
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
    fontVariant: ['tabular-nums'],
  },
  moveSan: {
    color: '#d8d8e0',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_BORDER,
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
    letterSpacing: 0.2,
  },
});
