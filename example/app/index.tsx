import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Chessboard, { ChessboardRef } from 'react-native-chessboard';
import type { PieceSymbol, Square } from 'chess.js';

type ScriptedMove = { from: Square; to: Square; promotion?: PieceSymbol };

// Compact move notation: "<from><to>[promotion]" tokens, e.g. "e2e4" / "h7h8r".
const parseGame = (game: string): ScriptedMove[] =>
  game
    .trim()
    .split(/\s+/)
    .map((token) => ({
      from: token.slice(0, 2) as Square,
      to: token.slice(2, 4) as Square,
      promotion: (token[4] as PieceSymbol) || undefined,
    }));

// Scripted game showing off en passant, promotion, and checkmate:
// 1.e4 a6 2.e5 d5 3.exd6 (e.p.) a5 4.dxe7 a4 5.exf8=Q+ Kxf8
// 6.Bc4 h6 7.Qf3 Ra6 8.Qxf7#
const SHORT_GAME = parseGame(
  'e2e4 a7a6 e4e5 d7d5 e5d6 a6a5 d6e7 a5a4 e7f8q e8f8 f1c4 h7h6 d1f3 ' +
    'a8a6 f3f7'
);

// Stress-test game for debugging: 325 half-moves of seeded pseudo-random
// play (captures preferred), ending in checkmate. Includes a rook
// promotion (h7h8r). Deterministic — regenerate with chess.js LCG seed 24.
const LONG_GAME = parseGame(
  'c2c3 c7c5 d2d3 d7d5 g2g3 a7a5 c1h6 e7e5 d1c2 g8h6 b1a3 d8b6 a1c1 ' +
    'b6b2 g1f3 b2a3 h1g1 a3b3 f3e5 b3a2 c2a2 f8d6 a2b1 c8d7 b1b2 d6e5 ' +
    'b2b7 e5c3 c1c3 e8d8 b7a8 g7g5 a8d5 d8e7 d5g5 e7e6 g5c5 a5a4 g3g4 ' +
    'h6g4 g1g4 b8a6 c5c4 e6e5 c4a4 d7a4 g4a4 h7h5 a4a6 h8h6 a6e6 h6e6 ' +
    'e2e3 e6h6 c3c8 h6d6 c8c5 e5f6 c5c8 d6d8 c8c6 f6f5 f2f3 d8d3 c6b6 ' +
    'd3e3 e1d1 h5h4 d1c1 e3e5 b6c6 f5f4 f1e2 e5c5 c1b2 c5c6 b2a2 c6c7 ' +
    'a2a1 f4e5 e2d1 c7b7 f3f4 e5f4 d1b3 b7b6 b3f7 b6c6 f7e8 c6b6 a1a2 ' +
    'b6b7 e8f7 h4h3 f7e8 b7b2 a2a1 f4f5 a1b2 f5g5 e8c6 g5f4 b2b3 f4f5 ' +
    'c6e4 f5e4 b3b2 e4e5 b2a2 e5d6 a2a1 d6e7 a1a2 e7d7 a2a1 d7c7 a1a2 ' +
    'c7c8 a2b2 c8c7 b2b3 c7c6 b3a3 c6b6 a3a4 b6a7 a4b5 a7b8 b5c4 b8c7 ' +
    'c4c5 c7b7 c5b4 b7c8 b4c4 c8b8 c4c5 b8c8 c5b4 c8d8 b4a5 d8e7 a5b6 ' +
    'e7f8 b6b5 f8e7 b5c4 e7f7 c4b3 f7f6 b3c4 f6e7 c4b3 e7d6 b3a2 d6d7 ' +
    'a2a1 d7c6 a1a2 c6b5 a2b1 b5a4 b1b2 a4b5 b2c1 b5c6 c1d1 c6c5 d1d2 ' +
    'c5c4 d2d1 c4d4 d1e1 d4c3 e1f2 c3c4 f2g1 c4b5 g1h1 b5a6 h1g1 a6a7 ' +
    'g1h1 a7b7 h1g1 b7c6 g1h1 c6d5 h1g1 d5c4 g1f2 c4b4 f2e1 b4b5 e1f2 ' +
    'b5b4 f2g3 b4a3 g3h4 a3b4 h4h3 b4c5 h3h4 c5b4 h4g3 b4b3 g3f4 b3a2 ' +
    'h2h3 a2a1 f4g5 a1b2 h3h4 b2c3 g5g6 c3b2 g6h6 b2c2 h6g5 c2b3 g5h5 ' +
    'b3a3 h5g6 a3b2 g6f7 b2c2 f7e6 c2b1 e6e7 b1a1 e7f7 a1a2 f7e6 a2b1 ' +
    'e6f6 b1c1 f6g6 c1b1 g6f5 b1a2 f5g4 a2a1 g4h3 a1a2 h4h5 a2a1 h3h4 ' +
    'a1b1 h4g3 b1a2 g3h2 a2a1 h2g2 a1a2 g2g1 a2a1 g1h1 a1b1 h5h6 b1a1 ' +
    'h1g1 a1b1 g1h1 b1c1 h1g2 c1d2 g2h1 d2e3 h1g1 e3e4 h6h7 e4f3 g1h2 ' +
    'f3f2 h2h3 f2e2 h7h8r e2d1 h3h2 d1e2 h8h6 e2d1 h6d6 d1c2 d6h6 c2b3 ' +
    'h2g1 b3c4 h6h1 c4d4 h1h5 d4d3 h5h8 d3c4 h8h3 c4b5 g1f2 b5b4 h3h4 ' +
    'b4b3 h4h1 b3a2 h1b1 a2a3 b1h1 a3a2 h1h5 a2b1 h5e5 b1b2 f2e3 b2c2 ' +
    'e5e8 c2b3 e3d4 b3b2 d4c5 b2a3 e8b8 a3a4 c5c6 a4a5 b8b3 a5a6 b3a3'
);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function App() {
  const ref = useRef<ChessboardRef>(null);
  const runningRef = useRef(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const autoplay = useCallback(async (game: ScriptedMove[]) => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      ref.current?.resetBoard();
      await delay(500);
      for (const move of game) {
        await ref.current?.move(move);
        await delay(100);
      }
    } finally {
      runningRef.current = false;
    }
  }, []);

  return (
    <View style={styles.container}>
      <Chessboard ref={ref} boardSize={width} />
      <View style={[styles.actions, { bottom: insets.bottom + 24 }]}>
        <Pressable onPress={() => autoplay(LONG_GAME)} style={styles.button}>
          <Ionicons name="infinite" size={24} color="white" />
        </Pressable>
        <Pressable onPress={() => autoplay(SHORT_GAME)} style={styles.button}>
          <Ionicons name="play" size={24} color="white" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  actions: {
    position: 'absolute',
    right: 24,
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
  },
});
