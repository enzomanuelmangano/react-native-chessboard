import type { Square } from 'chess.js';
import React, { createContext, useCallback } from 'react';
import type Animated from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';

import { useReversePiecePosition } from '../../notation';
import type { MoveType } from '../../types';
import { useSetBoard } from '../board-context/hooks';
import { useBoardRefs } from '../board-refs-context/hooks';
import { useChessEngine } from '../chess-engine-context/hooks';
import { useChessboardProps } from '../props-context/hooks';

type BoardOperationsContextType = {
  lastMove: Animated.SharedValue<MoveType | null>;
  selectableSquares: Animated.SharedValue<Square[]>;
  onMove: (from: Square, to: Square) => void;
  onSelectPiece: (square: Square) => void;
  moveTo: (to: Square) => void;
  selectedSquare: Animated.SharedValue<Square | null>;
};

const BoardOperationsContext = createContext<BoardOperationsContextType>(
  {} as any
);

const BoardOperationsContextProvider: React.FC = React.memo(({ children }) => {
  const chess = useChessEngine();
  const setBoard = useSetBoard();
  const { pieceSize } = useChessboardProps();
  const { toTranslation } = useReversePiecePosition();
  const selectableSquares = useSharedValue<Square[]>([]);
  const lastMove = useSharedValue<MoveType | null>(null);

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

      lastMove.value = { from, to };
      selectableSquares.value = [];
      selectedSquare.value = null;
      setBoard(chess.board());
    },
    [chess, isPromoting, lastMove, selectableSquares, selectedSquare, setBoard]
  );

  const onSelectPiece = useCallback(
    (square: Square) => {
      selectedSquare.value = square;

      const validSquares = (chess.moves({
        square,
      }) ?? []) as Square[];

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

  const refs = useBoardRefs();

  const moveTo = useCallback(
    (to: Square) => {
      if (selectedSquare.value != null) {
        refs?.current?.[selectedSquare.value].current?.moveTo(to);
        return true;
      }
      return false;
    },
    [refs, selectedSquare.value]
  );

  return (
    <BoardOperationsContext.Provider
      value={{
        lastMove,
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
