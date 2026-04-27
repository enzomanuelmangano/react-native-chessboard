import { useMemo, useCallback } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  runOnJS,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { Square } from 'chess.js';
import type { BoardState, BoardConfig } from '../state/types';
import { positionToSquare, squareToPosition } from '../state/use-board-state';
import type { MoveExecutor } from '../state/move-executor';

interface UseBoardGestureProps {
  boardState: BoardState;
  config: BoardConfig;
  moveExecutor: MoveExecutor;
  gestureEnabled: boolean;
}

export const useBoardGesture = ({
  boardState,
  config,
  moveExecutor,
  gestureEnabled,
}: UseBoardGestureProps) => {
  const { pieceSize, durations } = config;

  // Track the currently dragged piece
  const draggedSquare = useSharedValue<Square | null>(null);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);

  // Animation config
  const animationConfig = useMemo(
    () => ({
      duration: durations.move,
      easing: Easing.out(Easing.quad),
    }),
    [durations.move]
  );

  // Stable callback for tryMove
  const handleTryMove = useCallback(
    (from: Square, to: Square) => {
      moveExecutor.tryMove(from, to);
    },
    [moveExecutor]
  );

  // Stable callback for selectPiece
  const handleSelectPiece = useCallback(
    (square: Square) => {
      moveExecutor.selectPiece(square);
    },
    [moveExecutor]
  );

  const gesture = useMemo(() => {
    const panGesture = Gesture.Pan()
      .enabled(gestureEnabled)
      .onBegin((event) => {
        'worklet';
        const { x, y } = event;

        // Determine which square was tapped
        const square = positionToSquare(x, y, pieceSize);

        // Get the piece on this square
        const squareState = boardState.squares[square];
        const piece = squareState.piece.get();

        // Check if it's the current player's piece
        if (piece) {
          const pieceColor = piece[0] as 'w' | 'b';
          if (pieceColor === boardState.turn.get()) {
            // Start dragging this piece
            draggedSquare.set(square);
            dragStartX.set(squareState.translateX.get());
            dragStartY.set(squareState.translateY.get());

            // Raise the piece and scale it up slightly
            squareState.zIndex.set(100);
            squareState.scale.set(withTiming(1.1, { duration: 100 }));

            // Select the piece (show valid moves)
            runOnJS(handleSelectPiece)(square);
          }
        } else {
          // Tapped on empty square - check if we have a selected piece
          const selectedSquare = boardState.selectedSquare.get();
          if (selectedSquare) {
            const validMoves = boardState.validMoves.get();
            if (validMoves.includes(square)) {
              // This is a valid move - execute it
              runOnJS(handleTryMove)(selectedSquare, square);
            } else {
              // Clear selection
              boardState.selectedSquare.set(null);
              boardState.validMoves.set([]);
            }
          }
        }
      })
      .onUpdate((event) => {
        'worklet';
        const square = draggedSquare.get();
        if (!square) return;

        const squareState = boardState.squares[square];

        // Update piece position
        squareState.translateX.set(dragStartX.get() + event.translationX);
        squareState.translateY.set(dragStartY.get() + event.translationY);
      })
      .onEnd(() => {
        'worklet';
        const square = draggedSquare.get();
        if (!square) return;

        const squareState = boardState.squares[square];

        // Determine drop square
        const dropX = squareState.translateX.get() + pieceSize / 2;
        const dropY = squareState.translateY.get() + pieceSize / 2;

        // Clamp to board bounds
        const clampedX = Math.max(0, Math.min(dropX, pieceSize * 8 - 1));
        const clampedY = Math.max(0, Math.min(dropY, pieceSize * 8 - 1));

        const targetSquare = positionToSquare(clampedX, clampedY, pieceSize);

        // Reset scale
        squareState.scale.set(withTiming(1, { duration: 100 }));

        // Check if this is a valid move
        const validMoves = boardState.validMoves.get();

        if (targetSquare !== square && validMoves.includes(targetSquare)) {
          // Valid move - execute it
          // First, snap to target position for smoother animation
          const targetPos = squareToPosition(targetSquare, pieceSize);
          squareState.translateX.set(withTiming(targetPos.x, animationConfig));
          squareState.translateY.set(withTiming(targetPos.y, animationConfig));

          runOnJS(handleTryMove)(square, targetSquare);
        } else {
          // Invalid move - snap back to original position
          const originalPos = squareToPosition(square, pieceSize);
          squareState.translateX.set(withTiming(originalPos.x, animationConfig));
          squareState.translateY.set(withTiming(originalPos.y, animationConfig));
          squareState.zIndex.set(0);
        }

        draggedSquare.set(null);
      })
      .onFinalize(() => {
        'worklet';
        const square = draggedSquare.get();
        if (square) {
          const squareState = boardState.squares[square];
          squareState.scale.set(withTiming(1, { duration: 100 }));
          squareState.zIndex.set(0);
        }
        draggedSquare.set(null);
      });

    // Add tap gesture for selecting pieces
    const tapGesture = Gesture.Tap()
      .enabled(gestureEnabled)
      .onEnd((event) => {
        'worklet';
        const { x, y } = event;
        const square = positionToSquare(x, y, pieceSize);

        const selectedSquare = boardState.selectedSquare.get();

        if (selectedSquare) {
          // We have a piece selected
          if (square === selectedSquare) {
            // Tapped on same piece - deselect
            boardState.selectedSquare.set(null);
            boardState.validMoves.set([]);
          } else {
            // Check if it's a valid move
            const validMoves = boardState.validMoves.get();
            if (validMoves.includes(square)) {
              runOnJS(handleTryMove)(selectedSquare, square);
            } else {
              // Check if tapping on another own piece
              const piece = boardState.squares[square].piece.get();
              if (piece && piece[0] === boardState.turn.get()) {
                runOnJS(handleSelectPiece)(square);
              } else {
                // Deselect
                boardState.selectedSquare.set(null);
                boardState.validMoves.set([]);
              }
            }
          }
        } else {
          // No piece selected - try to select
          const piece = boardState.squares[square].piece.get();
          if (piece && piece[0] === boardState.turn.get()) {
            runOnJS(handleSelectPiece)(square);
          }
        }
      });

    // Combine gestures - pan takes precedence
    return Gesture.Simultaneous(tapGesture, panGesture);
  }, [
    boardState,
    pieceSize,
    draggedSquare,
    dragStartX,
    dragStartY,
    animationConfig,
    gestureEnabled,
    handleTryMove,
    handleSelectPiece,
  ]);

  return gesture;
};
