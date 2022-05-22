import React from 'react';

import { useBoard } from '../context/board-context/hooks';
import { useBoardRefs } from '../context/board-refs-context/hooks';
import { SIZE, toPosition } from '../notation';
import Piece from '../piece';

const Pieces: React.FC = React.memo(() => {
  const board = useBoard();
  const refs = useBoardRefs();

  return (
    <>
      {board.map((row, y) =>
        row.map((piece, x) => {
          if (piece !== null) {
            const square = toPosition({
              x: x * SIZE,
              y: y * SIZE,
            });

            return (
              <Piece
                ref={refs?.current?.[square]}
                key={`${x}-${y}`}
                id={`${piece.color}${piece.type}` as const}
                startPosition={{ x, y }}
                square={square}
              />
            );
          }
          return null;
        })
      )}
    </>
  );
});

export { Pieces };
