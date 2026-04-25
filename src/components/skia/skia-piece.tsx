import React from 'react';
import { Image, Group } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { Square } from 'chess.js';
import type { SquareState } from '../../state/types';
import type { PieceImages } from '../../assets/piece-images';

interface SkiaPieceProps {
  square: Square;
  squareState: SquareState;
  pieceImages: PieceImages;
  pieceSize: number;
}

export const SkiaPiece: React.FC<SkiaPieceProps> = React.memo(
  ({ squareState, pieceImages, pieceSize }) => {
    const currentImage = useDerivedValue((): SkImage | null => {
      const pieceCode = squareState.piece.value;
      if (!pieceCode) return null;
      return pieceImages[pieceCode] ?? null;
    }, [squareState.piece]);

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

    // Use useDerivedValue for opacity to show/hide based on piece presence
    const opacity = useDerivedValue(() => {
      return squareState.piece.value ? 1 : 0;
    }, [squareState.piece]);

    return (
      <Group transform={transform} origin={origin} opacity={opacity}>
        <Image
          image={currentImage}
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
