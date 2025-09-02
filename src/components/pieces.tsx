import React from 'react';
import { useChessboardProps } from '../context/props-context/hooks';

import { useBoard } from '../context/board-context/hooks';
import { usePieceRefs } from '../context/board-refs-context/hooks';

import Piece from './piece';
import { useReversePiecePosition } from '../notation';

import ArrowOverlay from './ArrowOverlay';

import { useBoardVisualWithArrows } from '../hooks/use-arrows';



const Pieces = React.memo(() => {
  const board = useBoard();
  const refs = usePieceRefs();
  const { pieceSize } = useChessboardProps();
  const { toPosition } = useReversePiecePosition();

const { boardSize, squareSize, orientation, arrows } = useBoardVisualWithArrows();

  return (
    <>
      {board.map((row, y) =>
        row.map((piece, x) => {
          if (piece !== null) {
            const square = toPosition({
              x: x * pieceSize,
              y: y * pieceSize,
            });

            return (
              <Piece
                ref={refs?.current?.[square]}
                key={`${x}-${y}`}
                id={`${piece.color}${piece.type}` as const}
                startPosition={{ x, y }}
                square={square}
                size={pieceSize}
              />
            );
          }
          return null;
        })
      )}

      <ArrowOverlay
        arrows={arrows}
        boardSize={boardSize}
        squareSize={squareSize}
        orientation={orientation}
      />

    </>
  );
});

export { Pieces };
