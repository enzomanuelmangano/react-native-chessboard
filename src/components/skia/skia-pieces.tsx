import React, { useMemo } from 'react';
import { Group } from '@shopify/react-native-skia';
import type { Square } from 'chess.js';
import { SQUARES } from '../../state/types';
import { useBoardStateValues } from '../../state';
import { SkiaPiece } from './skia-piece';
import type { PieceImages } from '../../assets/piece-images';

interface SkiaPiecesProps {
  pieceImages: PieceImages;
}

export const SkiaPieces: React.FC<SkiaPiecesProps> = React.memo(
  ({ pieceImages }) => {
    const boardState = useBoardStateValues();

    const pieces = useMemo(() => {
      return SQUARES.map((square: Square) => (
        <SkiaPiece
          key={square}
          square={square}
          squareState={boardState.squares[square]}
          pieceImages={pieceImages}
        />
      ));
    }, [boardState.squares, pieceImages]);

    return <Group>{pieces}</Group>;
  }
);

SkiaPieces.displayName = 'SkiaPieces';
