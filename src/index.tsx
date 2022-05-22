import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

import Background from './components/chessboard-background';
import { HighlightedSquares } from './components/highlighted-squares';
import { Pieces } from './components/pieces';
import { SuggestedDots } from './components/suggested-dots';
import { ChessBoardContextProvider } from './context/board-context-provider';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width,
    aspectRatio: 1,
  },
});

type ChessBoardProps = {
  fen?: string;
};

const ChessBoard: React.FC<ChessBoardProps> = React.memo(() => {
  return (
    <View style={styles.container}>
      <Background />
      <Pieces />
      <HighlightedSquares />
      <SuggestedDots />
    </View>
  );
});

const ChessBoardContainer: React.FC<ChessBoardProps> = React.memo(({ fen }) => {
  return (
    <ChessBoardContextProvider fen={fen}>
      <ChessBoard />
    </ChessBoardContextProvider>
  );
});

export default ChessBoardContainer;
