import React from 'react';
import { Canvas } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import { useBoardConfig } from '../../state';
import { usePieceImages } from '../../assets/piece-images';
import { BoardBackground } from './board-background';
import { SkiaHighlights } from './skia-highlights';
import { SkiaDots } from './skia-dots';
import { SkiaPieces } from './skia-pieces';

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
});

export const SkiaBoard: React.FC = React.memo(() => {
  const { boardSize } = useBoardConfig();
  const pieceImages = usePieceImages();

  return (
    <Canvas style={[styles.canvas, { width: boardSize, height: boardSize }]}>
      <BoardBackground />
      <SkiaHighlights />
      <SkiaDots />
      <SkiaPieces pieceImages={pieceImages} />
    </Canvas>
  );
});

SkiaBoard.displayName = 'SkiaBoard';
