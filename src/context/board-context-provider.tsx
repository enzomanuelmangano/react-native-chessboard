import { Chess } from 'chess.js';
import React, { useState } from 'react';
import { useConst } from '../hooks/use-const';

import { BoardContext, BoardSetterContext } from './board-context';
import { BoardOperationsContextProvider } from './board-operations-context';
import { BoardRefsContextProvider } from './board-refs-context';
import { ChessEngineContext } from './chess-engine-context';

type BoardContextProviderProps = {
  fen?: string;
};

const ChessBoardContextProvider: React.FC<BoardContextProviderProps> =
  React.memo(({ children, fen }) => {
    const chess = useConst(() => new Chess(fen));

    const [board, setBoard] = useState(chess.board());

    return (
      <BoardContext.Provider value={board}>
        <ChessEngineContext.Provider value={chess}>
          <BoardSetterContext.Provider value={setBoard}>
            <BoardRefsContextProvider>
              <BoardOperationsContextProvider>
                {children}
              </BoardOperationsContextProvider>
            </BoardRefsContextProvider>
          </BoardSetterContext.Provider>
        </ChessEngineContext.Provider>
      </BoardContext.Provider>
    );
  });

export {
  ChessBoardContextProvider,
  ChessEngineContext,
  BoardContext,
  BoardSetterContext,
};
