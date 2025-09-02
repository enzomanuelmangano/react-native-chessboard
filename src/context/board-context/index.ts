import type { ChessInstance, PieceType } from 'chess.js';
import React, { createContext } from 'react';
import type { Player } from '../../types';

import { useContext } from 'react';
import { ArrowsContext } from '../board-refs-context'; 


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

const useBoardContext = () => {
  const boardCtx = useContext(BoardContext);
  const arrows = useContext(ArrowsContext);

  if (!boardCtx) {
    throw new Error('useBoardContext must be used inside BoardContext.Provider');
  }

  return {
    ...boardCtx, 
    arrows: arrows || []
  };
};


export { BoardContext, BoardSetterContext, useBoardContext };
