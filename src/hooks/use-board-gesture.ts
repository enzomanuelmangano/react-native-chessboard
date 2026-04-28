import { useMemo, useCallback } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS, withSpring } from 'react-native-reanimated';
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
  const { pieceSize, animations } = config;

  // Track the currently dragged piece
  const draggedSquare = useSharedValue<Square | null>(null);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  // Offset between touch point and piece position (to follow finger exactly)
  const touchOffsetX = useSharedValue(0);
  const touchOffsetY = useSharedValue(0);

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
        const square = positionToSquare(x, y, pieceSize);
        const squareState = boardState.squares[square];
        const piece = squareState.piece.get();
        const turn = boardState.turn.get();

        // Check if touching own piece - start dragging
        const isOwnPiece = piece && piece[0] === turn;
        if (isOwnPiece) {
          draggedSquare.set(square);
          dragStartX.set(squareState.translateX.get());
          dragStartY.set(squareState.translateY.get());

          // Calculate offset from piece CENTER for proper scaling behavior
          const pieceCenterX = squareState.translateX.get() + pieceSize / 2;
          const pieceCenterY = squareState.translateY.get() + pieceSize / 2;
          touchOffsetX.set(x - pieceCenterX);
          touchOffsetY.set(y - pieceCenterY);

          // Raise and scale the piece
          squareState.zIndex.set(100);
          squareState.scale.set(withSpring(1.1, animations.scale));

          runOnJS(handleSelectPiece)(square);
          return;
        }

        // Not touching a piece - check if we can move a selected piece here
        const selectedSquare = boardState.selectedSquare.get();
        if (!selectedSquare) return;

        const validMoves = boardState.validMoves.get();
        if (validMoves.includes(square)) {
          runOnJS(handleTryMove)(selectedSquare, square);
          return;
        }

        // Invalid target - clear selection
        boardState.selectedSquare.set(null);
        boardState.validMoves.set([]);
      })
      .onUpdate((event) => {
        'worklet';
        const square = draggedSquare.get();
        if (!square) return;

        const squareState = boardState.squares[square];

        // Update piece position using center-based offset
        // Subtracting pieceSize/2 converts from center back to top-left (translateX/Y)
        squareState.translateX.set(event.x - touchOffsetX.get() - pieceSize / 2);
        squareState.translateY.set(event.y - touchOffsetY.get() - pieceSize / 2);
      })
      .onEnd(() => {
        'worklet';
        const square = draggedSquare.get();
        if (!square) return;

        const squareState = boardState.squares[square];
        squareState.scale.set(withSpring(1, animations.scale));

        // Calculate drop position with bounds clamping
        const dropX = squareState.translateX.get() + pieceSize / 2;
        const dropY = squareState.translateY.get() + pieceSize / 2;
        const clampedX = Math.max(0, Math.min(dropX, pieceSize * 8 - 1));
        const clampedY = Math.max(0, Math.min(dropY, pieceSize * 8 - 1));
        const targetSquare = positionToSquare(clampedX, clampedY, pieceSize);

        const validMoves = boardState.validMoves.get();
        const isValidMove = targetSquare !== square && validMoves.includes(targetSquare);

        if (isValidMove) {
          const targetPos = squareToPosition(targetSquare, pieceSize);
          squareState.translateX.set(withSpring(targetPos.x, animations.move));
          squareState.translateY.set(withSpring(targetPos.y, animations.move));
          // Note: zIndex stays elevated during animation - move-executor resets it after completion
          runOnJS(handleTryMove)(square, targetSquare);
          draggedSquare.set(null);
          return;
        }

        // Invalid move - snap back to original position
        const originalPos = squareToPosition(square, pieceSize);
        squareState.translateX.set(withSpring(originalPos.x, animations.snapBack));
        squareState.translateY.set(withSpring(originalPos.y, animations.snapBack));
        squareState.zIndex.set(0);
        draggedSquare.set(null);
      })
      .onFinalize(() => {
        'worklet';
        const square = draggedSquare.get();
        if (square) {
          const squareState = boardState.squares[square];
          squareState.scale.set(withSpring(1, animations.scale));
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
        const piece = boardState.squares[square].piece.get();
        const turn = boardState.turn.get();
        const isOwnPiece = piece && piece[0] === turn;

        // Case 1: No piece selected - try to select own piece
        if (!selectedSquare) {
          if (isOwnPiece) {
            runOnJS(handleSelectPiece)(square);
          }
          return;
        }

        // Case 2: Tapped on same piece - deselect
        if (square === selectedSquare) {
          boardState.selectedSquare.set(null);
          boardState.validMoves.set([]);
          return;
        }

        // Case 3: Tapped on valid move target - execute move
        const validMoves = boardState.validMoves.get();
        if (validMoves.includes(square)) {
          runOnJS(handleTryMove)(selectedSquare, square);
          return;
        }

        // Case 4: Tapped on another own piece - switch selection
        if (isOwnPiece) {
          runOnJS(handleSelectPiece)(square);
          return;
        }

        // Case 5: Invalid target - deselect
        boardState.selectedSquare.set(null);
        boardState.validMoves.set([]);
      });

    // Combine gestures - pan takes precedence
    return Gesture.Simultaneous(tapGesture, panGesture);
  }, [
    boardState,
    pieceSize,
    draggedSquare,
    dragStartX,
    dragStartY,
    touchOffsetX,
    touchOffsetY,
    animations,
    gestureEnabled,
    handleTryMove,
    handleSelectPiece,
  ]);

  return gesture;
};
