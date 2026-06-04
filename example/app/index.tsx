import React, { useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Chessboard, { ChessboardRef } from 'react-native-chessboard';

export default function App() {
  const ref = useRef<ChessboardRef>(null);
  const { width } = useWindowDimensions();

  return (
    <View style={styles.container}>
      <Chessboard ref={ref} boardSize={width} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
