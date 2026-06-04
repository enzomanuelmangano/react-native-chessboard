import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Chessboard, { ChessboardRef } from 'react-native-chessboard';
import type { Square } from 'chess.js';

// Opera Game — Morphy vs Duke Karl / Count Isouard, Paris 1858. Ends 17.Rd8#.
const OPERA_GAME: Array<[Square, Square]> = [
  ['e2', 'e4'],
  ['e7', 'e5'],
  ['g1', 'f3'],
  ['d7', 'd6'],
  ['d2', 'd4'],
  ['c8', 'g4'],
  ['d4', 'e5'],
  ['g4', 'f3'],
  ['d1', 'f3'],
  ['d6', 'e5'],
  ['f1', 'c4'],
  ['g8', 'f6'],
  ['f3', 'b3'],
  ['d8', 'e7'],
  ['b1', 'c3'],
  ['c7', 'c6'],
  ['c1', 'g5'],
  ['b7', 'b5'],
  ['c3', 'b5'],
  ['c6', 'b5'],
  ['c4', 'b5'],
  ['b8', 'd7'],
  ['e1', 'c1'], // O-O-O
  ['a8', 'd8'],
  ['d1', 'd7'],
  ['d8', 'd7'],
  ['h1', 'd1'],
  ['e7', 'e6'],
  ['b5', 'd7'],
  ['f6', 'd7'],
  ['b3', 'b8'],
  ['d7', 'b8'],
  ['d1', 'd8'], // Rd8#
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function App() {
  const ref = useRef<ChessboardRef>(null);
  const runningRef = useRef(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const autoplay = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      ref.current?.resetBoard();
      await delay(500);
      for (const [from, to] of OPERA_GAME) {
        await ref.current?.move({ from, to });
        await delay(350);
      }
    } finally {
      runningRef.current = false;
    }
  }, []);

  return (
    <View style={styles.container}>
      <Chessboard ref={ref} boardSize={width} />
      <Pressable
        onPress={autoplay}
        style={[styles.playButton, { bottom: insets.bottom + 24 }]}
      >
        <Ionicons name="play" size={24} color="white" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    position: 'absolute',
    left: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
  },
});
