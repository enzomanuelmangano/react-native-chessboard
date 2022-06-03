import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import Chessboard, { ChessboardRef } from 'react-native-chessboard';

export default function App() {
  const ref = useRef<ChessboardRef>(null);

  useEffect(() => {
    setTimeout(() => {
      ref.current.highlight({ square: 'a2' });
    }, 5000);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Chessboard ref={ref} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
