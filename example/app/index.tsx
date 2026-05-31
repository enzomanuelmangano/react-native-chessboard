import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import Chessboard, { ChessboardRef, MoveResult } from 'react-native-chessboard';
import { useRipple } from './ripple';

type Color = 'w' | 'b';
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

// Two-line title for the native nav bar: game name + live status caption.
const HeaderTitle: React.FC<{ status: string }> = ({ status }) => (
  <View style={{ alignItems: 'center' }}>
    <Text style={styles.navTitle}>Fool’s Mate</Text>
    <Text style={styles.navSub} numberOfLines={1}>
      {status}
    </Text>
  </View>
);

const FlipButton: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <Pressable hitSlop={16} onPress={onPress}>
    <Text style={styles.navIcon}>⇅</Text>
  </Pressable>
);

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

  // Active-turn indicator breathes so the screen has life between moves.
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (toMove) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 950, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [toMove, pulse]);
  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + pulse.value * 0.55,
    transform: [{ scale: 0.8 + pulse.value * 0.5 }],
  }));

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
        {toMove ? <Animated.View style={[styles.clockDot, dotStyle]} /> : null}
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

export default function GameScreen() {
  const ref = useRef<ChessboardRef>(null);
  const boardBoxRef = useRef<View>(null);
  const runningRef = useRef(false);
  const loopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { fire } = useRipple();

  const [status, setStatus] = useState('White to move');
  const [moves, setMoves] = useState<string[]>([]);
  const [captured, setCaptured] = useState<{ w: string[]; b: string[] }>({
    w: [],
    b: [],
  });
  const [flipped, setFlipped] = useState(false);
  const { width } = useWindowDimensions();
  // Board spans the full screen width — the hero of the screen.
  const boardSize = width;
  const pieceSize = boardSize / 8;

  // One mount entrance: the board settles in (subtle scale + fade).
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

  // Press feedback for the primary control, driven on the UI thread.
  const replayScale = useSharedValue(1);
  const replayStyle = useAnimatedStyle(() => ({
    transform: [{ scale: replayScale.value }],
  }));

  // Sweep the glass wave (full window) out from the king that just changed
  // state — king square in window coordinates.
  const fireRipple = useCallback(
    async (fen: string, moverColor: Color) => {
      const kingColor: Color = moverColor === 'w' ? 'b' : 'w';
      const king = kingFromFen(fen, kingColor);
      if (!king) return;
      const box = await measureInWindow(boardBoxRef);
      if (!box) return;
      const col = flipped ? 7 - king.file : king.file;
      const row = flipped ? 7 - king.rowFromTop : king.rowFromTop;
      fire(
        box.x + col * pieceSize + pieceSize / 2,
        box.y + row * pieceSize + pieceSize / 2
      );
    },
    [flipped, pieceSize, fire]
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
        // Wait out the move spring (~300ms) so the captured frame shows the
        // piece landed.
        setTimeout(() => fireRipple(result.state.fen, result.move.color), 480);
      }
    },
    [fireRipple]
  );

  const playSequence = useCallback(async () => {
    if (loopTimer.current) {
      clearTimeout(loopTimer.current);
      loopTimer.current = null;
    }
    if (runningRef.current) return;
    runningRef.current = true;
    ref.current?.resetBoard();
    setMoves([]);
    setCaptured({ w: [], b: [] });
    setStatus('White to move');
    await delay(700);
    for (const [from, to] of FOOLS_MATE) {
      await ref.current?.move({ from: from as any, to: to as any });
      await delay(450);
    }
    runningRef.current = false;
    // Loop the showcase so the board is never frozen — let the wave play,
    // linger on the result, then replay.
    loopTimer.current = setTimeout(() => playSequence(), 5200);
  }, []);

  useEffect(() => {
    playSequence();
    return () => {
      if (loopTimer.current) clearTimeout(loopTimer.current);
    };
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
      {/* Real native nav bar — title, status caption, flip action. */}
      <Stack.Screen
        options={{
          headerTitle: () => <HeaderTitle status={status} />,
          headerRight: () => (
            <FlipButton onPress={() => setFlipped((f) => !f)} />
          ),
        }}
      />

      <View style={styles.content}>
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
  );
}

const GLASS_BORDER = 'rgba(255,255,255,0.10)';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b0b0f',
  },
  content: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },

  glass: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_BORDER,
    borderRadius: 14,
  },

  // Native-header title view + flip action.
  navIcon: {
    color: '#0a84ff',
    fontSize: 20,
    fontWeight: '600',
  },
  navTitle: {
    color: '#f5f5f7',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  navSub: {
    color: '#8a8a98',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
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
