import type { Square } from 'chess.js';
import React, { createContext, useRef } from 'react';

import { useChessEngine } from '../chess-engine-context/hooks';

const BoardRefsContext = createContext<React.MutableRefObject<Record<
  Square,
  React.MutableRefObject<{ moveTo: (to: Square) => void }>
> | null> | null>(null);

const BoardRefsContextProvider: React.FC = React.memo(({ children }) => {
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
          const row = `${8 - Math.round(y)}`;
          const square = `${col}${row}` as Square;

          // eslint-disable-next-line react-hooks/rules-of-hooks
          acc = { ...acc, [square]: useRef(null) };
        }
      }

      return acc as any;
    })()
  );

  // useEffect(() => {
  //   setTimeout(() => {
  //     chess.move({ from: 'b2', to: 'b3' });
  //     setBoard(chess.board());
  //     chess.move({ from: 'b7', to: 'b6' });
  //     setBoard(chess.board());
  //     refs?.current?.b3?.current?.moveTo('b4');
  //   }, 5000);
  // }, [chess, setBoard]);

  return (
    <BoardRefsContext.Provider value={refs}>
      {children}
    </BoardRefsContext.Provider>
  );
});

export { BoardRefsContext, BoardRefsContextProvider };
