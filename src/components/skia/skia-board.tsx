import React from 'react';
import { Canvas } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import type { BoardConfig, BoardState } from '../../state';
import type { PieceImages } from '../../assets/piece-images';
import { BoardBackground } from './board-background';
import { SkiaHighlights } from './skia-highlights';
import { SkiaDots } from './skia-dots';
import { SkiaPieces } from './skia-pieces';

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
});

interface SkiaBoardProps {
  config: BoardConfig;
  boardState: BoardState;
  pieceImages: PieceImages;
}

export const SkiaBoard: React.FC<SkiaBoardProps> = React.memo(
  ({ config, boardState, pieceImages }) => {
    const { boardSize, pieceSize } = config;

    return (
      <Canvas style={[styles.canvas, { width: boardSize, height: boardSize }]}>
        <BoardBackground config={config} />
        <SkiaHighlights config={config} boardState={boardState} />
        <SkiaDots config={config} boardState={boardState} />
        <SkiaPieces
          pieceImages={pieceImages}
          boardState={boardState}
          pieceSize={pieceSize}
        />
      </Canvas>
    );
  }
);

SkiaBoard.displayName = 'SkiaBoard';
