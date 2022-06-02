import { Chess } from 'chess.js';
import React, { useImperativeHandle, useRef, useState } from 'react';
import { useConst } from '../hooks/use-const';

import { BoardContext, BoardSetterContext } from './board-context';
import { BoardOperationsContextProvider } from './board-operations-context';
import { BoardRefsContextProvider, ChessboardRef } from './board-refs-context';
import { ChessEngineContext } from './chess-engine-context';

type BoardContextProviderProps = {
  fen?: string;
  children?: React.ReactNode;
};

const ChessboardContextProviderComponent = React.forwardRef<
  ChessboardRef,
  BoardContextProviderProps
>(({ children, fen }, ref) => {
  const chess = useConst(() => new Chess(fen));
  const chessboardRef = useRef<ChessboardRef>(null);
  const [board, setBoard] = useState(chess.board());

  useImperativeHandle(
    ref,
    () => ({ move: (params) => chessboardRef.current?.move?.(params) }),
    []
  );

  return (
    <BoardContext.Provider value={board}>
      <ChessEngineContext.Provider value={chess}>
        <BoardSetterContext.Provider value={setBoard}>
          <BoardRefsContextProvider ref={chessboardRef}>
            <BoardOperationsContextProvider>
              {children}
            </BoardOperationsContextProvider>
          </BoardRefsContextProvider>
        </BoardSetterContext.Provider>
      </ChessEngineContext.Provider>
    </BoardContext.Provider>
  );
});

const ChessboardContextProvider = React.memo(
  ChessboardContextProviderComponent
);
export {
  ChessboardContextProvider,
  ChessEngineContext,
  BoardContext,
  BoardSetterContext,
};
