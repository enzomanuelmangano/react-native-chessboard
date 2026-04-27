import React, { useState, useEffect } from 'react';
import { Image, Group } from '@shopify/react-native-skia';
import { useDerivedValue, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import type { Square } from 'chess.js';
import type { SquareState, PieceCode } from '../../state/types';
import type { PieceImages } from '../../assets/piece-images';

interface SkiaPieceProps {
  square: Square;
  squareState: SquareState;
  pieceImages: PieceImages;
  pieceSize: number;
}

export const SkiaPiece: React.FC<SkiaPieceProps> = React.memo(
  ({ square, squareState, pieceImages, pieceSize }) => {
    // Use React state to track piece code so we re-render when it changes
    const [pieceCode, setPieceCode] = useState<PieceCode>(squareState.piece.value);

    // Sync shared value to React state
    useAnimatedReaction(
      () => squareState.piece.value,
      (current, previous) => {
        if (current !== previous) {
          runOnJS(setPieceCode)(current);
        }
      },
      [squareState.piece]
    );

    const image = pieceCode ? pieceImages[pieceCode] : null;

    const transform = useDerivedValue(() => {
      return [
        { translateX: squareState.translateX.value },
        { translateY: squareState.translateY.value },
        { scale: squareState.scale.value },
      ];
    }, [squareState.translateX, squareState.translateY, squareState.scale]);

    const origin = useDerivedValue(() => {
      return {
        x: squareState.translateX.value + pieceSize / 2,
        y: squareState.translateY.value + pieceSize / 2,
      };
    }, [squareState.translateX, squareState.translateY, pieceSize]);

    if (!image) return null;

    return (
      <Group transform={transform} origin={origin}>
        <Image
          image={image}
          x={0}
          y={0}
          width={pieceSize}
          height={pieceSize}
          fit="contain"
        />
      </Group>
    );
  }
);

SkiaPiece.displayName = 'SkiaPiece';
