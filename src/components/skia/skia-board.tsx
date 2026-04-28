import React from 'react';
import { Canvas } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import type { BoardConfig, BoardState } from '../../state';
import { BoardBackground } from './board-background';
import { SkiaHighlights } from './skia-highlights';
import { SkiaDots } from './skia-dots';
import { SkiaPiecesAtlas } from './skia-pieces-atlas';

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
});

interface SkiaBoardProps {
  config: BoardConfig;
  boardState: BoardState;
  spriteImage: SkImage | null;
}

export const SkiaBoard: React.FC<SkiaBoardProps> = React.memo(
  ({ config, boardState, spriteImage }) => {
    const { boardSize, pieceSize } = config;

    return (
      <Canvas style={[styles.canvas, { width: boardSize, height: boardSize }]}>
        <BoardBackground config={config} />
        <SkiaHighlights config={config} boardState={boardState} />
        <SkiaDots config={config} boardState={boardState} />
        <SkiaPiecesAtlas
          spriteImage={spriteImage}
          boardState={boardState}
          pieceSize={pieceSize}
        />
      </Canvas>
    );
  }
);

SkiaBoard.displayName = 'SkiaBoard';
