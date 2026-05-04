import React from 'react';
import { Canvas, Group } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
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

    const progressSV = effectParams?.progress;
    const effectOpacity = useDerivedValue(() => {
      if (!progressSV) return 0;
      const p = progressSV.value;
      // Hard on while the shader is animating, hard off otherwise. The
      // shader itself tapers amplitude + chromatic separation to zero
      // before progress hits 1, so the cut is invisible.
      return p > 0 && p < 1 ? 1 : 0;
    });

    const board = (
      <>
        <BoardBackground config={config} />
        <SkiaHighlights config={config} boardState={boardState} />
        <SkiaDots config={config} boardState={boardState} />
        <SkiaPiecesAtlas
          spriteImage={spriteImage}
          boardState={boardState}
          pieceSize={pieceSize}
        />
      </>
    );

    return (
      <Canvas style={[styles.canvas, { width: boardSize, height: boardSize }]}>
        {board}
        {renderEffect && effectParams && (
          <Group layer opacity={effectOpacity}>
            {renderEffect(effectParams)}
            {board}
          </Group>
        )}
      </Canvas>
    );
  }
);

SkiaBoard.displayName = 'SkiaBoard';
