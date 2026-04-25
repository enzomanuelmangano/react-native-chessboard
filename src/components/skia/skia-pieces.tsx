import React, { useMemo } from 'react';
import { Group } from '@shopify/react-native-skia';
import type { Square } from 'chess.js';
import { SQUARES, BoardState } from '../../state/types';
import { SkiaPiece } from './skia-piece';
import type { PieceImages } from '../../assets/piece-images';

interface SkiaPiecesProps {
  pieceImages: PieceImages;
  boardState: BoardState;
  pieceSize: number;
}

export const SkiaPieces: React.FC<SkiaPiecesProps> = React.memo(
  ({ pieceImages, boardState, pieceSize }) => {
    const pieces = useMemo(() => {
      return SQUARES.map((square: Square) => (
        <SkiaPiece
          key={square}
          square={square}
          squareState={boardState.squares[square]}
          pieceImages={pieceImages}
          pieceSize={pieceSize}
        />
      ));
    }, [boardState.squares, pieceImages, pieceSize]);

    return <Group>{pieces}</Group>;
  }
);

SkiaPieces.displayName = 'SkiaPieces';
