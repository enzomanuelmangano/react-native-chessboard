import React, { useMemo } from 'react';
import { Group } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { Square } from 'chess.js';
import { SQUARES, BoardState } from '../../state/types';
import { SkiaPiece } from './skia-piece';
import type { PieceImages } from '../../assets/piece-images';

interface SkiaPiecesProps {
  pieceImages: PieceImages;
  boardState: BoardState;
  pieceSize: number;
}

// Component for a single piece that renders at its zIndex layer
const PieceLayer: React.FC<{
  square: Square;
  boardState: BoardState;
  pieceImages: PieceImages;
  pieceSize: number;
  elevated: boolean;
}> = React.memo(({ square, boardState, pieceImages, pieceSize, elevated }) => {
  const squareState = boardState.squares[square];

  // Only render if this piece matches the requested layer
  const shouldRender = useDerivedValue(() => {
    const isElevated = squareState.zIndex.get() > 0;
    return isElevated === elevated;
  });

  const opacity = useDerivedValue(() => {
    return shouldRender.get() ? 1 : 0;
  });

  return (
    <Group opacity={opacity}>
      <SkiaPiece
        square={square}
        squareState={squareState}
        pieceImages={pieceImages}
        pieceSize={pieceSize}
      />
    </Group>
  );
});

PieceLayer.displayName = 'PieceLayer';

export const SkiaPieces: React.FC<SkiaPiecesProps> = React.memo(
  ({ pieceImages, boardState, pieceSize }) => {
    // Render pieces in two layers:
    // 1. Base layer: all pieces with zIndex <= 0 (normal pieces)
    // 2. Elevated layer: pieces with zIndex > 0 (dragged piece)
    const basePieces = useMemo(
      () =>
        SQUARES.map((square: Square) => (
          <PieceLayer
            key={`base-${square}`}
            square={square}
            boardState={boardState}
            pieceImages={pieceImages}
            pieceSize={pieceSize}
            elevated={false}
          />
        )),
      [boardState, pieceImages, pieceSize]
    );

    const elevatedPieces = useMemo(
      () =>
        SQUARES.map((square: Square) => (
          <PieceLayer
            key={`elevated-${square}`}
            square={square}
            boardState={boardState}
            pieceImages={pieceImages}
            pieceSize={pieceSize}
            elevated={true}
          />
        )),
      [boardState, pieceImages, pieceSize]
    );

    return (
      <Group>
        {basePieces}
        {elevatedPieces}
      </Group>
    );
  }
);

SkiaPieces.displayName = 'SkiaPieces';
