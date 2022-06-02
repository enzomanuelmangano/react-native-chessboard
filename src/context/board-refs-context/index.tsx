import type { Square } from 'chess.js';
import React, { createContext, useImperativeHandle, useRef } from 'react';

import { useChessEngine } from '../chess-engine-context/hooks';

const BoardRefsContext = createContext<React.MutableRefObject<Record<
  Square,
  React.MutableRefObject<{ moveTo: (to: Square) => void }>
> | null> | null>(null);

export type ChessboardRef = {
  move: (_: { from: Square; to: Square; animation?: boolean }) => void;
};

const BoardRefsContextProviderComponent = React.forwardRef<
  ChessboardRef,
  { children?: React.ReactNode }
>(({ children }, ref) => {
  const chess = useChessEngine();
  const board = chess.board();

  const refs: React.MutableRefObject<Record<
    Square,
    React.MutableRefObject<{ moveTo: (to: Square) => void }>
  > | null> = useRef(
    (() => {
      let acc = {};
      for (let x = 0; x < board.length; x++) {
        const row = board[x];
        for (let y = 0; y < row.length; y++) {
          const col = String.fromCharCode(97 + Math.round(x));
          // eslint-disable-next-line no-shadow
          const row = `${8 - Math.round(y)}`;
          const square = `${col}${row}` as Square;

          // eslint-disable-next-line react-hooks/rules-of-hooks
          acc = { ...acc, [square]: useRef(null) };
        }
      }

      return acc as any;
    })()
  );

  useImperativeHandle(
    ref,
    () => ({
      // TODO: Handle animation
      move: ({ from, to }) => {
        refs?.current?.[from].current.moveTo(to);
      },
    }),
    []
  );

  return (
    <BoardRefsContext.Provider value={refs}>
      {children}
    </BoardRefsContext.Provider>
  );
});

const BoardRefsContextProvider = React.memo(BoardRefsContextProviderComponent);

export { BoardRefsContext, BoardRefsContextProvider };
