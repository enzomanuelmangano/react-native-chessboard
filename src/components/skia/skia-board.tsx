import React from 'react';
import { Canvas, Group } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import type { BoardConfig, BoardState } from '../../state';
import type { EffectParams } from '../../types';
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
  renderEffect?: (params: EffectParams) => React.ReactNode;
  effectParams?: EffectParams;
}

export const SkiaBoard: React.FC<SkiaBoardProps> = React.memo(
  ({ config, boardState, spriteImage, renderEffect, effectParams }) => {
    const { boardSize, pieceSize } = config;

    return (
      <Canvas style={[styles.canvas, { width: boardSize, height: boardSize }]}>
        <Group layer>
          {renderEffect && effectParams && renderEffect(effectParams)}
          <BoardBackground config={config} />
          <SkiaHighlights config={config} boardState={boardState} />
          <SkiaDots config={config} boardState={boardState} />
          <SkiaPiecesAtlas
            spriteImage={spriteImage}
            boardState={boardState}
            pieceSize={pieceSize}
          />
        </Group>
      </Canvas>
    );
  }
);

SkiaBoard.displayName = 'SkiaBoard';
