import React, { useMemo } from 'react';
import { Image, Group } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SquareState } from '../../state/types';
import type { PieceType } from '../../types';
import type { PieceImages } from '../../assets/piece-images';

// All piece types - used for opacity-based rendering
// Note: This approach (rendering all 12 with opacity) is intentional for Skia's
// worklet-based rendering. It avoids React re-renders during piece changes.
// A sprite sheet optimization (single Image with clip rect) is available via
// the usePieceSpriteSheet hook in piece-images.ts
const PIECE_TYPES: PieceType[] = [
  'wp',
  'wn',
  'wb',
  'wr',
  'wq',
  'wk',
  'bp',
  'bn',
  'bb',
  'br',
  'bq',
  'bk',
];

interface SkiaPieceProps {
  square: string;
  squareState: SquareState;
  pieceImages: PieceImages;
  pieceSize: number;
}

interface SinglePieceProps {
  pieceType: PieceType;
  squareState: SquareState;
  pieceImages: PieceImages;
  pieceSize: number;
}

// Renders a single piece type with opacity based on whether it matches the square's piece
const SinglePiece: React.FC<SinglePieceProps> = React.memo(
  ({ pieceType, squareState, pieceImages, pieceSize }) => {
    const image = pieceImages[pieceType];

    const opacity = useDerivedValue(() => {
      return squareState.piece.get() === pieceType ? 1 : 0;
    });

    if (!image) return null;

    return (
      <Image
        image={image}
        x={0}
        y={0}
        width={pieceSize}
        height={pieceSize}
        fit="contain"
        opacity={opacity}
      />
    );
  }
);

SinglePiece.displayName = 'SinglePiece';

export const SkiaPiece: React.FC<SkiaPieceProps> = React.memo(
  ({ square: _square, squareState, pieceImages, pieceSize }) => {
    const transform = useDerivedValue(() => [
      { translateX: squareState.translateX.get() },
      { translateY: squareState.translateY.get() },
      { scale: squareState.scale.get() },
    ]);

    // Origin is relative to the Group's local coordinate system (after translation)
    // Since the Group is translated to the piece position, origin should be the center
    // of the piece within its own coordinate system (0,0 to pieceSize,pieceSize)
    const origin = useMemo(
      () => ({ x: pieceSize / 2, y: pieceSize / 2 }),
      [pieceSize]
    );

    return (
      <Group transform={transform} origin={origin}>
        {PIECE_TYPES.map((pieceType) => (
          <SinglePiece
            key={pieceType}
            pieceType={pieceType}
            squareState={squareState}
            pieceImages={pieceImages}
            pieceSize={pieceSize}
          />
        ))}
      </Group>
    );
  }
);

SkiaPiece.displayName = 'SkiaPiece';
