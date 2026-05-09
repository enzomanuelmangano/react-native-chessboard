import { useMemo, useCallback } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { Square } from 'chess.js';
import type { BoardState, BoardConfig } from '../state/types';
import { positionToSquare, squareToPosition } from '../state/use-board-state';
import type { MoveExecutor } from '../state/move-executor';

interface UseBoardGestureProps {
  boardState: BoardState;
  config: BoardConfig;
  moveExecutor: MoveExecutor;
  gestureEnabled: boolean;
  onIllegalMove?: (from: Square, to: Square) => void;
}

export const useBoardGesture = ({
  boardState,
  config,
  moveExecutor,
  gestureEnabled,
  onIllegalMove,
}: UseBoardGestureProps) => {
  const { pieceSize, animations, flipped } = config;

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

  // Stable callback for illegal move
  const handleIllegalMove = useCallback(
    (from: Square, to: Square) => {
      onIllegalMove?.(from, to);
    },
    [onIllegalMove]
  );

  const gesture = useMemo(() => {
    const panGesture = Gesture.Pan()
      .enabled(gestureEnabled)
      .minDistance(5) // Require some movement before starting drag
      .onBegin((event) => {
        'worklet';
        // Just prepare for potential drag - store touch info
        const { x, y } = event;
        const square = positionToSquare(x, y, pieceSize, flipped);
        const squareState = boardState.squares[square];
        const piece = squareState.piece.get();

        if (piece) {
          // Store drag start info (but don't start drag yet)
          draggedSquare.set(square);
          dragStartX.set(squareState.translateX.get());
          dragStartY.set(squareState.translateY.get());

          const pieceCenterX = squareState.translateX.get() + pieceSize / 2;
          const pieceCenterY = squareState.translateY.get() + pieceSize / 2;
          touchOffsetX.set(x - pieceCenterX);
          touchOffsetY.set(y - pieceCenterY);
        }
      })
      .onStart(() => {
        'worklet';
        // Drag actually started (minDistance exceeded)
        const square = draggedSquare.get();
        if (!square) return;

        const squareState = boardState.squares[square];
        const piece = squareState.piece.get();
        const turn = boardState.turn.get();

        // Raise and scale the piece
        squareState.zIndex.set(100);
        squareState.scale.set(withSpring(1.1, animations.scale));

        // Only show valid moves (dots) for own pieces
        const isOwnPiece = piece && piece[0] === turn;
        if (isOwnPiece) {
          scheduleOnRN(handleSelectPiece, square);
        }
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

        // Only process drop if piece was actually dragged (zIndex > 0)
        const wasDragged = squareState.zIndex.get() > 0;
        if (!wasDragged) {
          draggedSquare.set(null);
          return;
        }

        squareState.scale.set(withSpring(1, animations.scale));

        // Check if this is own piece - only own pieces can make moves
        const piece = squareState.piece.get();
        const turn = boardState.turn.get();
        const isOwnPiece = piece && piece[0] === turn;

        // If not own piece, just snap back (can't make moves with opponent's pieces)
        if (!isOwnPiece) {
          const originalPos = squareToPosition(square, pieceSize, flipped);
          squareState.translateX.set(withSpring(originalPos.x, animations.snapBack));
          squareState.translateY.set(withSpring(originalPos.y, animations.snapBack));
          squareState.zIndex.set(0);
          // Clear any previous selection/valid moves
          boardState.selectedSquare.set(null);
          boardState.validMoves.set([]);
          draggedSquare.set(null);
          return;
        }

        // Calculate drop position with bounds clamping
        const dropX = squareState.translateX.get() + pieceSize / 2;
        const dropY = squareState.translateY.get() + pieceSize / 2;
        const clampedX = Math.max(0, Math.min(dropX, pieceSize * 8 - 1));
        const clampedY = Math.max(0, Math.min(dropY, pieceSize * 8 - 1));
        const targetSquare = positionToSquare(clampedX, clampedY, pieceSize, flipped);

        const validMoves = boardState.validMoves.get();
        const isValidMove = targetSquare !== square && validMoves.includes(targetSquare);

        if (isValidMove) {
          const targetPos = squareToPosition(targetSquare, pieceSize, flipped);
          squareState.translateX.set(withSpring(targetPos.x, animations.move));
          squareState.translateY.set(withSpring(targetPos.y, animations.move));
          // Note: zIndex stays elevated during animation - move-executor resets it after completion
          scheduleOnRN(handleTryMove, square, targetSquare);
          draggedSquare.set(null);
          return;
        }

        // Invalid move - snap back to original position and clear selection
        const originalPos = squareToPosition(square, pieceSize, flipped);
        squareState.translateX.set(withSpring(originalPos.x, animations.snapBack));
        squareState.translateY.set(withSpring(originalPos.y, animations.snapBack));
        squareState.zIndex.set(0);
        boardState.selectedSquare.set(null);
        boardState.validMoves.set([]);
        // Notify about illegal move (only if actually moved to different square)
        if (targetSquare !== square) {
          scheduleOnRN(handleIllegalMove, square, targetSquare);
        }
        draggedSquare.set(null);
      })
      .onFinalize(() => {
        'worklet';
        const square = draggedSquare.get();
        if (square) {
          const squareState = boardState.squares[square];
          // Only reset if piece was actually dragged
          if (squareState.zIndex.get() > 0) {
            squareState.scale.set(withSpring(1, animations.scale));
            squareState.zIndex.set(0);
          }
        }
        draggedSquare.set(null);
      });

    // Add tap gesture for selecting pieces
    const tapGesture = Gesture.Tap()
      .enabled(gestureEnabled)
      .onEnd((event) => {
        'worklet';
        const { x, y } = event;
        const square = positionToSquare(x, y, pieceSize, flipped);
        const selectedSquare = boardState.selectedSquare.get();
        const piece = boardState.squares[square].piece.get();
        const turn = boardState.turn.get();
        const isOwnPiece = piece && piece[0] === turn;

        // Case 1: No piece selected - try to select own piece
        if (!selectedSquare) {
          if (isOwnPiece) {
            scheduleOnRN(handleSelectPiece, square);
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
          scheduleOnRN(handleTryMove, selectedSquare, square);
          return;
        }

        // Case 4: Tapped on another own piece - switch selection
        if (isOwnPiece) {
          scheduleOnRN(handleSelectPiece, square);
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
    flipped,
    draggedSquare,
    dragStartX,
    dragStartY,
    touchOffsetX,
    touchOffsetY,
    animations,
    gestureEnabled,
    handleTryMove,
    handleSelectPiece,
    handleIllegalMove,
  ]);

  return gesture;
};
