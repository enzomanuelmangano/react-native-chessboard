import type { ChessInstance, PieceType } from 'chess.js';
import React, { createContext } from 'react';

const BoardContext = createContext<ReturnType<ChessInstance['board']>>(
  {} as any
);

const BoardSetterContext = createContext<
  React.Dispatch<
    React.SetStateAction<
      ({
        type: PieceType;
        color: 'b' | 'w';
      } | null)[][]
    >
  >
>({} as any);

export { BoardContext, BoardSetterContext };
