import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
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
} from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Chessboard, { ChessboardRef, MoveResult } from 'react-native-chessboard';
import { useRipple } from '../components/ripple';
import { theme } from '../components/theme';

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
    <Ionicons name="swap-vertical" size={23} color={theme.accent} />
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
        <Text
          style={[
            styles.avatarGlyph,
            { color: side === 'w' ? theme.bg : theme.text },
          ]}
        >
          ♚
        </Text>
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

// Single horizontal gutter shared by the board and all chrome, so every
// left/right edge lines up.
const GUTTER = 16;

// Board themed off the same OKLCH ramp as the UI: slate squares, accent-blue
// last-move, red mate — all in the shared hue family.
const BOARD_COLORS = {
  white: theme.boardLight,
  black: theme.boardDark,
  lastMoveHighlight: 'rgba(58,145,248,0.40)', // theme.accent @ 0.40
  checkmateHighlight: theme.lose,
};

// The board is isolated behind React.memo so the chrome's per-move state
// updates (status / moves / captured) never reconcile the Chessboard
// subtree. Its props are all stable — it re-renders only on flip / resize.
const Board = memo(function Board({
  chessRef,
  boxRef,
  boardSize,
  flipped,
  onMove,
}: {
  chessRef: React.RefObject<ChessboardRef | null>;
  boxRef: React.RefObject<View | null>;
  boardSize: number;
  flipped: boolean;
  onMove: (result: MoveResult) => void;
}) {
  return (
    <View ref={boxRef} collapsable={false}>
      <Chessboard
        ref={chessRef}
        boardSize={boardSize}
        flipped={flipped}
        onMove={onMove}
        colors={BOARD_COLORS}
      />
    </View>
  );
});

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
  const { fire } = useRipple();

  const [status, setStatus] = useState('White to move');
  const [moves, setMoves] = useState<string[]>([]);
  const [captured, setCaptured] = useState<{ w: string[]; b: string[] }>({
    w: [],
    b: [],
  });
  const [flipped, setFlipped] = useState(false);
  const { width } = useWindowDimensions();
  // Board spans the full screen width — the hero. Chrome is inset to GUTTER.
  const boardSize = width;
  const pieceSize = boardSize / 8;

  // No mount/entrance animation — the screen renders in place (the only
  // motion is the on-mate ripple and the active-turn pulse).

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
  }, []);

  // Rematch: reset to a fresh, playable board — no canned replay.
  const rematch = useCallback(() => {
    if (runningRef.current) return;
    ref.current?.resetBoard();
    setMoves([]);
    setCaptured({ w: [], b: [] });
    setStatus('White to move');
  }, []);

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
        <View style={styles.topGroup}>
          {/* Opponent (black) — top */}
          <View style={styles.playerWrap}>
            <PlayerCard
              side="b"
              captured={captured.b}
              lead={leadB}
              toMove={turn === 'b'}
              clock="2:46"
              result={resultFor('b')}
            />
          </View>

          {/* Board */}
          <View style={styles.boardHero}>
            <Board
              chessRef={ref}
              boxRef={boardBoxRef}
              boardSize={boardSize}
              flipped={flipped}
              onMove={handleMove}
            />
          </View>

          {/* You (white) — bottom */}
          <View style={styles.playerWrap}>
            <PlayerCard
              side="w"
              captured={captured.w}
              lead={leadW}
              toMove={turn === 'w'}
              clock="3:09"
              result={resultFor('w')}
            />
          </View>

          {/* Move history — hugs the board */}
          <View style={styles.moveListWrap}>
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
          </View>
        </View>

        {/* Rematch — pinned to the bottom as the primary action */}
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
            onPress={rematch}
            style={styles.replayButton}
          >
            <MaterialCommunityIcons
              name="sword-cross"
              size={18}
              color={theme.text}
            />
            <Text style={styles.replayText}>Rematch</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const HAIRLINE = StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },

  glass: {
    backgroundColor: theme.surface,
    borderWidth: HAIRLINE,
    borderColor: theme.border,
    borderRadius: 14,
  },

  // Native-header title view.
  navTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  navSub: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
    marginTop: 2,
  },

  // Board + players + move list, grouped at the top.
  topGroup: {
    alignItems: 'center',
    gap: 10,
  },
  boardHero: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Player row
  playerWrap: {
    width: '100%',
    paddingHorizontal: GUTTER,
  },
  player: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: HAIRLINE,
    borderColor: 'transparent',
  },
  playerActive: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: HAIRLINE,
  },
  avatarW: {
    backgroundColor: theme.boardLight,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarB: {
    backgroundColor: theme.surfaceHi,
    borderColor: theme.border,
  },
  avatarGlyph: {
    fontSize: 26,
    lineHeight: 30,
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
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  playerRating: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  resultTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    overflow: 'hidden',
  },
  resultWin: {
    color: theme.win,
    backgroundColor: 'rgba(95,225,158,0.15)',
  },
  resultLose: {
    color: theme.lose,
    backgroundColor: 'rgba(245,107,118,0.15)',
  },
  tray: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 16,
  },
  trayPieces: {
    color: theme.textMuted,
    fontSize: 15,
    lineHeight: 17,
  },
  trayLead: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  clock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: theme.surfaceHi,
  },
  clockActive: {
    backgroundColor: 'rgba(95,225,158,0.15)',
  },
  clockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.win,
  },
  clockText: {
    color: theme.textMuted,
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  clockTextActive: {
    color: theme.text,
  },

  // Move list hugs the board (top group); width-full minus the gutter.
  moveListWrap: {
    width: '100%',
    paddingHorizontal: GUTTER,
  },
  // Rematch pinned to the bottom as the primary action.
  replayWrap: {
    paddingHorizontal: GUTTER,
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
    color: theme.textFaint,
    fontSize: 13,
    letterSpacing: 0.1,
  },
  moveToken: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  moveNo: {
    color: theme.textFaint,
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  moveSan: {
    color: theme.text,
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
    backgroundColor: theme.surface,
    borderWidth: HAIRLINE,
    borderColor: theme.border,
  },
  replayText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
