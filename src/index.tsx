import React, { forwardRef } from 'react';
import type { ImageSourcePropType } from 'react-native';
import type { Move, Square } from 'chess.js';
import { BoardStateProvider } from './state';
import type { BoardStateProviderProps } from './state';
import { GestureBoard } from './components/skia';
import type { MoveResult } from './state/move-executor';
import type { ChessboardRef } from './hooks';
import type { ChessboardState } from './helpers/get-chessboard-state';
import type { EffectParams } from './types';

export interface ChessboardProps
  extends Omit<BoardStateProviderProps, 'children'> {
  onMove?: (result: MoveResult) => void;
  onIllegalMove?: (from: Square, to: Square) => void;
  renderEffect?: (params: EffectParams) => React.ReactNode;
  /**
   * Optional custom piece sprite sheet. Must match the standard
   * 6×2 / 128px-cell layout (row 0 = white p,n,b,r,q,k; row 1 =
   * black). Falls back to the bundled sheet when omitted.
   */
  spriteSource?: ImageSourcePropType;
  /**
   * Optional font asset for the board's letter and number labels
   * (e.g. `require('./Inter.ttf')`). Falls back to the platform
   * system font when omitted.
   */
  fontSource?: ImageSourcePropType;
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
      onMove,
      onIllegalMove,
      renderEffect,
      spriteSource,
      fontSource,
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
        fontSource={fontSource}
      >
        <GestureBoard
          ref={ref}
          onMove={onMove}
          onIllegalMove={onIllegalMove}
          renderEffect={renderEffect}
          spriteSource={spriteSource}
        />
      </BoardStateProvider>
    );
  }
);

Chessboard.displayName = 'Chessboard';

export default Chessboard;
export { Chessboard };
export type { ChessboardRef, ChessboardState, MoveResult, Move };
export type { EffectParams } from './types';
