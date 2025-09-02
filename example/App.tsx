import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import Chessboard from 'react-native-chessboard';
import type { ChessboardRef } from 'react-native-chessboard';


export default function App() {
  const chessboardRef = useRef<ChessboardRef>(null);

  useEffect(() => {
    (async () => {
      await chessboardRef.current?.arrows([['e2','e4'],['d2', 'd4']]);
      await chessboardRef.current?.move({ from: 'e2', to: 'e4' });
      await chessboardRef.current?.arrows([['e7','e5'],['c7', 'c6'],['g8','f6']]);
      await chessboardRef.current?.move({ from: 'e7', to: 'e5' });
      await chessboardRef.current?.arrows([['f1','c4'],['b1', 'c2'],['g1', 'f3']]);
      await chessboardRef.current?.move({ from: 'd1', to: 'f3' });
      await chessboardRef.current?.arrows([['g8','f6'],['d8', 'f6']]);
      await chessboardRef.current?.move({ from: 'a7', to: 'a6' });
      await chessboardRef.current?.arrows([['f1','c4'],['b1', 'c3'],['g1', 'e2']]);
      await chessboardRef.current?.move({ from: 'f1', to: 'c4' });
      await chessboardRef.current?.arrows([['g8','f6'],['d8', 'f6']]);
      await chessboardRef.current?.move({ from: 'a6', to: 'a5' });
      await chessboardRef.current?.arrows([['f3', 'f7'],['c4','f7'],['b1', 'c3']]);
      // await ref.current?.move({ from: 'f3', to: 'f7' });
    })();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Chessboard
        ref={chessboardRef}
        durations={{ move: 1000 }}
        boardSize={500}

        onMove={({ state }) => {
          if (state.in_checkmate) {
            console.log('Life goes on.');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
