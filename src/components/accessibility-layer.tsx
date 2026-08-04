import React, { useCallback, useReducer } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Chess, Square } from 'chess.js';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';

import type { BoardConfig, BoardState } from '../state/types';
import { SQUARES } from '../state/types';
import { squareToPosition } from '../state/use-board-state';
import type { MoveExecutor } from '../state/move-executor';

const COLOR_NAME: Record<'w' | 'b', string> = { w: 'white', b: 'black' };
const PIECE_NAME: Record<string, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

const describeSquare = (chess: Chess, square: Square): string => {
  const piece = chess.get(square);
  if (!piece) return `${square}, empty`;
  return `${square}, ${COLOR_NAME[piece.color]} ${PIECE_NAME[piece.type]}`;
};

interface AccessibilityLayerProps {
  chess: Chess;
  boardState: BoardState;
  config: BoardConfig;
  moveExecutor: MoveExecutor;
}

/**
 * Transparent overlay that makes the Skia-rendered board usable by screen
 * readers. Each square is an accessible button labelled with its contents
 * (e.g. "e4, white pawn"); activating one runs the same select / move flow as
 * a tap. `pointerEvents="none"` keeps sighted drag & tap flowing through to the
 * canvas underneath — VoiceOver/TalkBack still activate via the a11y tree.
 */
export const AccessibilityLayer: React.FC<AccessibilityLayerProps> = ({
  chess,
  boardState,
  config,
  moveExecutor,
}) => {
  const { pieceSize, flipped } = config;

  // The board lives in SharedValues (UI thread); labels are React props, so
  // mirror "something changed" into a render tick. turn + lastMove move on
  // essentially every mutation (play, undo, reset, fen load).
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useAnimatedReaction(
    () => {
      const lm = boardState.lastMove.get();
      return `${boardState.turn.get()}:${lm ? `${lm.from}${lm.to}` : ''}`;
    },
    (curr, prev) => {
      if (prev !== null && curr !== prev) runOnJS(bump)();
    }
  );

  // Mirror of the tap state machine (use-board-gesture), run on the JS thread
  // from an accessibility activation.
  const activate = useCallback(
    (square: Square) => {
      const selected = boardState.selectedSquare.get();
      const piece = boardState.squares[square].piece.get();
      const turn = boardState.turn.get();
      const isOwnPiece = !!piece && piece[0] === turn;

      if (!selected) {
        if (isOwnPiece) moveExecutor.selectPiece(square);
        return;
      }
      if (square === selected) {
        boardState.selectedSquare.set(null);
        boardState.validMoves.set([]);
        return;
      }
      if (boardState.validMoves.get().includes(square)) {
        moveExecutor.tryMove(selected, square);
        return;
      }
      if (isOwnPiece) {
        moveExecutor.selectPiece(square);
        return;
      }
      boardState.selectedSquare.set(null);
      boardState.validMoves.set([]);
    },
    [boardState, moveExecutor]
  );

  const selectedSquare = boardState.selectedSquare.get();

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      accessibilityLabel={`Chessboard, ${
        COLOR_NAME[boardState.turn.get()]
      } to move`}
    >
      {SQUARES.map((square) => {
        const pos = squareToPosition(square, pieceSize, flipped);
        return (
          <View
            key={square}
            // none → sighted touches fall through to the Skia canvas; VoiceOver
            // still activates via onAccessibilityTap.
            pointerEvents="none"
            accessible
            accessibilityRole="button"
            accessibilityLabel={describeSquare(chess, square)}
            accessibilityState={{ selected: square === selectedSquare }}
            onAccessibilityTap={() => activate(square)}
            style={[
              styles.square,
              {
                left: pos.x,
                top: pos.y,
                width: pieceSize,
                height: pieceSize,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  square: {
    position: 'absolute',
  },
});
