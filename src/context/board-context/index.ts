import type { ChessInstance, PieceType } from 'chess.js';
import React, { createContext } from 'react';
import type { Player } from '../../types';

const BoardContext = createContext<ReturnType<ChessInstance['board']>>(
  {} as any
);

const BoardSetterContext = createContext<
  React.Dispatch<
    React.SetStateAction<
      ({
        type: PieceType;
        color: Player;
      } | null)[][]
    >
  >
>({} as any);

export { BoardContext, BoardSetterContext };
