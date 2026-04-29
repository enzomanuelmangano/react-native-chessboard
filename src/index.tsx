import React, { forwardRef } from 'react';
import type { Move, Square } from 'chess.js';
import { BoardStateProvider } from './state';
import type { BoardStateProviderProps } from './state';
import { GestureBoard } from './components/skia';
import type { MoveResult } from './state/move-executor';
import type { ChessboardRef } from './hooks';
import type { ChessboardState } from './helpers/get-chessboard-state';

export interface ChessboardProps
  extends Omit<BoardStateProviderProps, 'children'> {
  onMove?: (result: MoveResult) => void;
  onIllegalMove?: (from: Square, to: Square) => void;
}

const Chessboard = forwardRef<ChessboardRef, ChessboardProps>(
  (
    {
      fen,
      boardSize,
      gestureEnabled,
      flipped,
      withLetters,
      withNumbers,
      colors,
      durations,
      onMove,
      onIllegalMove,
    },
    ref
  ) => {
    return (
      <BoardStateProvider
        fen={fen}
        boardSize={boardSize}
        gestureEnabled={gestureEnabled}
        flipped={flipped}
        withLetters={withLetters}
        withNumbers={withNumbers}
        colors={colors}
        durations={durations}
      >
        <GestureBoard ref={ref} onMove={onMove} onIllegalMove={onIllegalMove} />
      </BoardStateProvider>
    );
  }
);

Chessboard.displayName = 'Chessboard';

export default Chessboard;
export { Chessboard };
export type { ChessboardRef, ChessboardState, MoveResult, Move };
