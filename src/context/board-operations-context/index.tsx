import type { Square } from 'chess.js';
import React, { createContext, useCallback } from 'react';
import type Animated from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';

import { useReversePiecePosition } from '../../notation';
import { useSetBoard } from '../board-context/hooks';
import type { ChessboardRef } from '../board-refs-context';
import { useChessEngine } from '../chess-engine-context/hooks';
import { useChessboardProps } from '../props-context/hooks';

type BoardOperationsContextType = {
  selectableSquares: Animated.SharedValue<Square[]>;
  onMove: (from: Square, to: Square) => void;
  onSelectPiece: (square: Square) => void;
  moveTo: (to: Square) => void;
  selectedSquare: Animated.SharedValue<Square | null>;
};

const BoardOperationsContext = createContext<BoardOperationsContextType>(
  {} as any
);

const BoardOperationsContextProvider: React.FC<{ controller?: ChessboardRef }> =
  React.memo(({ children, controller }) => {
    const chess = useChessEngine();
    const setBoard = useSetBoard();
    const { pieceSize } = useChessboardProps();
    const { toTranslation } = useReversePiecePosition();
    const selectableSquares = useSharedValue<Square[]>([]);
    const selectedSquare = useSharedValue<Square | null>(null);

    const isPromoting = useCallback(
      (from: Square, to: Square) => {
        if (!to.includes('8') && !to.includes('1')) return false;

        const val = toTranslation(from);
        const x = Math.floor(val.x / pieceSize);
        const y = Math.floor(val.y / pieceSize);
        const piece = chess.board()[y][x];

        return (
          piece?.type === chess.PAWN &&
          ((to.includes('8') && piece.color === chess.WHITE) ||
            (to.includes('1') && piece.color === chess.BLACK))
        );
      },
      [chess, pieceSize, toTranslation]
    );

    const onMove = useCallback(
      (from: Square, to: Square) => {
        const move = chess.move({
          from,
          to,
          promotion: isPromoting(from, to) ? 'q' : undefined,
        });

        if (move == null) return;

        const lastMove = { from, to };
        controller?.resetAllHighlightedSquares();
        controller?.highlight({ square: lastMove.from });
        controller?.highlight({ square: lastMove.to });

        selectableSquares.value = [];
        selectedSquare.value = null;
        setBoard(chess.board());
      },
      [
        chess,
        controller,
        isPromoting,
        selectableSquares,
        selectedSquare,
        setBoard,
      ]
    );

    const onSelectPiece = useCallback(
      (square: Square) => {
        selectedSquare.value = square;

        const validSquares = (chess.moves({
          square,
        }) ?? []) as Square[];

        // eslint-disable-next-line no-shadow
        selectableSquares.value = validSquares.map((square) => {
          const splittedSquare = square.split('x');
          if (splittedSquare.length === 0) {
            return square;
          }

          return splittedSquare[splittedSquare.length - 1] as Square;
        });
      },
      [chess, selectableSquares, selectedSquare]
    );

    const moveTo = useCallback(
      (to: Square) => {
        if (selectedSquare.value != null) {
          controller?.move({ from: selectedSquare.value, to: to });
          return true;
        }
        return false;
      },
      [controller, selectedSquare.value]
    );

    return (
      <BoardOperationsContext.Provider
        value={{
          onMove,
          onSelectPiece,
          moveTo,
          selectableSquares,
          selectedSquare,
        }}
      >
        {children}
      </BoardOperationsContext.Provider>
    );
  });

export { BoardOperationsContextProvider, BoardOperationsContext };
