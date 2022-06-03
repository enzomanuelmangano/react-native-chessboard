import type { PieceType, Square } from 'chess.js';
import React, { createContext, useCallback } from 'react';
import type Animated from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';

import { useReversePiecePosition } from '../../notation';
import { useSetBoard } from '../board-context/hooks';
import { useBoardPromotion } from '../board-promotion-context/hooks';
import type { ChessboardRef } from '../board-refs-context';
import { usePieceRefs } from '../board-refs-context/hooks';
import { useChessEngine } from '../chess-engine-context/hooks';
import { useChessboardProps } from '../props-context/hooks';

type BoardOperationsContextType = {
  selectableSquares: Animated.SharedValue<Square[]>;
  onMove: (from: Square, to: Square) => void;
  onSelectPiece: (square: Square) => void;
  moveTo: (to: Square) => void;
  isPromoting: (from: Square, to: Square) => boolean;
  selectedSquare: Animated.SharedValue<Square | null>;
};

const BoardOperationsContext = createContext<BoardOperationsContextType>(
  {} as any
);

const BoardOperationsContextProvider: React.FC<{ controller?: ChessboardRef }> =
  React.memo(({ children, controller }) => {
    const chess = useChessEngine();
    const setBoard = useSetBoard();
    const { pieceSize, onMove: onChessboardMoveCallback } =
      useChessboardProps();
    const { toTranslation } = useReversePiecePosition();
    const selectableSquares = useSharedValue<Square[]>([]);
    const selectedSquare = useSharedValue<Square | null>(null);
    const { showPromotionDialog } = useBoardPromotion();
    const pieceRefs = usePieceRefs();

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

    const moveProgrammatically = useCallback(
      (from: Square, to: Square, promotionPiece?: PieceType) => {
        const move = chess.move({
          from,
          to,
          promotion: promotionPiece as any,
        });

        if (move == null) return;

        onChessboardMoveCallback?.({
          move,
          state: {
            in_check: chess.in_check(),
            in_checkmate: chess.in_checkmate(),
            in_draw: chess.in_draw(),
            in_stalemate: chess.in_stalemate(),
            in_threefold_repetition: chess.in_threefold_repetition(),
            insufficient_material: chess.insufficient_material(),
            in_promotion: promotionPiece != null,
          },
        });

        setBoard(chess.board());
      },
      [chess, onChessboardMoveCallback, setBoard]
    );

    const onMove = useCallback(
      (from: Square, to: Square) => {
        selectableSquares.value = [];
        selectedSquare.value = null;
        const lastMove = { from, to };
        controller?.resetAllHighlightedSquares();
        controller?.highlight({ square: lastMove.from });
        controller?.highlight({ square: lastMove.to });

        const in_promotion = isPromoting(from, to);
        if (!in_promotion) {
          moveProgrammatically(from, to);
          return;
        }

        pieceRefs?.current?.[to]?.current?.enable(false);
        showPromotionDialog({
          type: chess.turn(),
          onSelect: (piece) => {
            moveProgrammatically(from, to, piece);
            pieceRefs?.current?.[to]?.current?.enable(true);
          },
        });
      },
      [
        chess,
        controller,
        isPromoting,
        moveProgrammatically,
        pieceRefs,
        selectableSquares,
        selectedSquare,
        showPromotionDialog,
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
          isPromoting,
        }}
      >
        {children}
      </BoardOperationsContext.Provider>
    );
  });

export { BoardOperationsContextProvider, BoardOperationsContext };
