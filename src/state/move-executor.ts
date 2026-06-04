import { withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { SharedValue } from 'react-native-reanimated';
import type { Chess, Move, Square, PieceSymbol } from 'chess.js';
import type { BoardState, PieceCode } from './types';
import { squareToPosition } from './use-board-state';
import type { BoardConfig } from './types';
import type { EffectTrigger } from '../types';
import {
  getChessboardState,
  ChessboardState,
} from '../helpers/get-chessboard-state';
import { findKingSquare } from '../helpers/find-king-square';

export type MoveResult = {
  move: Move;
  state: ChessboardState & { isPromotion: boolean };
};

export type EffectSharedValues = {
  centerX: SharedValue<number>;
  centerY: SharedValue<number>;
  progress: SharedValue<number>;
  trigger: SharedValue<EffectTrigger>;
};

type MoveCallbacks = {
  onMove?: (result: MoveResult) => void;
  onPromotionRequired?: (info: {
    from: Square;
    to: Square;
    color: 'w' | 'b';
    complete: (piece: PieceSymbol) => void;
  }) => void;
  effectSharedValues?: EffectSharedValues;
};

export const createMoveExecutor = (
  chess: Chess,
  boardState: BoardState,
  config: BoardConfig,
  callbacks: MoveCallbacks
) => {
  const { pieceSize, animations, flipped } = config;

  const updateHighlightsAfterMove = (from: Square, to: Square) => {
    // Last move: flip only the affected squares' per-square flags. The
    // global `lastMove` stays as the record of what's currently lit, read
    // here to clear the previous pair (so only ~4 square worklets wake,
    // not all 64 pulling from a shared global).
    const prevLast = boardState.lastMove.get();
    if (prevLast) {
      boardState.squares[prevLast.from].lastMove.set(false);
      boardState.squares[prevLast.to].lastMove.set(false);
    }
    boardState.squares[from].lastMove.set(true);
    boardState.squares[to].lastMove.set(true);
    boardState.lastMove.set({ from, to });

    // Check / checkmate: same per-square targeting via the king square.
    const isInCheck = chess.isCheck();
    boardState.isCheck.set(isInCheck);

    const prevKing = boardState.kingInCheckSquare.get();
    const kingSquare =
      isInCheck || chess.isCheckmate()
        ? findKingSquare(chess, chess.turn())
        : null;
    if (prevKing && prevKing !== kingSquare) {
      boardState.squares[prevKing].inCheck.set(false);
    }
    if (kingSquare) {
      boardState.squares[kingSquare].inCheck.set(true);
    }
    boardState.kingInCheckSquare.set(kingSquare);
  };

  const executeMove = (
    from: Square,
    to: Square,
    promotionPiece?: PieceSymbol,
    // Fires on the JS thread once the piece's move animation has settled
    // (or was cancelled). Lets `tryMove` resolve only when the board is
    // visually consistent, so awaited moves can never overlap animations.
    onAnimationComplete?: () => void
  ): Move | null => {
    // Validate and execute the move in chess.js
    let move: Move | null;
    try {
      move = chess.move({
        from,
        to,
        promotion: promotionPiece,
      });
    } catch {
      // chess.js throws for invalid moves
      return null;
    }

    if (!move) return null;

    const fromState = boardState.squares[from];
    const toState = boardState.squares[to];
    const movingPiece = fromState.piece.get();

    // Handle capture - clear target square piece
    if (move.captured) {
      toState.piece.set(null);
    }

    // Animate the piece
    const toPos = squareToPosition(to, pieceSize, flipped);
    const fromPos = squareToPosition(from, pieceSize, flipped);

    // Raise the moving piece
    fromState.zIndex.set(100);

    // Pre-compute the final piece code to avoid capturing complex objects in worklet
    const finalPieceCode: PieceCode = promotionPiece
      ? (`${move.color}${promotionPiece}` as PieceCode)
      : movingPiece;

    const commitMove = (finished?: boolean) => {
      'worklet';
      // Only commit the sprite writes if the spring actually settled. A
      // cancelled spring (resetBoard, or a newer animation on the same
      // square) means whoever cancelled it now owns this square's state —
      // writing here would smear stale pieces onto the fresh board.
      if (finished) {
        // Move complete - update piece positions
        toState.piece.set(finalPieceCode);
        fromState.piece.set(null);

        // Reset position to original square for future use
        fromState.translateX.set(fromPos.x);
        fromState.translateY.set(fromPos.y);
        fromState.zIndex.set(0);
      }
      if (onAnimationComplete) {
        scheduleOnRN(onAnimationComplete);
      }
    };

    // Attach the commit to an axis that actually travels. A spring whose
    // target equals its current value settles immediately — putting the
    // callback there commits the move before any motion happens, so the
    // piece teleports (horizontal moves have dy === 0).
    const movesVertically = toPos.y !== fromPos.y;
    fromState.translateX.set(
      withSpring(
        toPos.x,
        animations.move,
        movesVertically ? undefined : commitMove
      )
    );
    fromState.translateY.set(
      withSpring(
        toPos.y,
        animations.move,
        movesVertically ? commitMove : undefined
      )
    );

    // Handle castling - move the rook
    if (move.flags.includes('k') || move.flags.includes('q')) {
      const isKingside = move.flags.includes('k');
      const rank = move.color === 'w' ? '1' : '8';

      const rookFrom = ((isKingside ? 'h' : 'a') + rank) as Square;
      const rookTo = ((isKingside ? 'f' : 'd') + rank) as Square;

      const rookFromState = boardState.squares[rookFrom];
      const rookToState = boardState.squares[rookTo];
      const rookPiece = rookFromState.piece.get();

      const rookToPos = squareToPosition(rookTo, pieceSize, flipped);
      const rookFromPos = squareToPosition(rookFrom, pieceSize, flipped);

      // The rook slides along its rank — horizontal — so the commit must
      // ride the X spring (the Y spring settles instantly; see commitMove).
      rookFromState.translateX.set(
        withSpring(rookToPos.x, animations.move, (finished) => {
          'worklet';
          if (!finished) return;
          rookToState.piece.set(rookPiece);
          rookFromState.piece.set(null);

          rookFromState.translateX.set(rookFromPos.x);
          rookFromState.translateY.set(rookFromPos.y);
        })
      );
      rookFromState.translateY.set(withSpring(rookToPos.y, animations.move));
    }

    // Handle en passant - remove the captured pawn
    if (move.flags.includes('e')) {
      const capturedPawnFile = to[0];
      const capturedPawnRank = from[1];
      const capturedPawnSquare = (capturedPawnFile +
        capturedPawnRank) as Square;
      boardState.squares[capturedPawnSquare].piece.set(null);
    }

    // Update board state
    boardState.turn.set(chess.turn());
    boardState.selectedSquare.set(null);
    boardState.validMoves.set([]);
    updateHighlightsAfterMove(from, to);

    // Call the onMove callback
    if (callbacks.onMove) {
      const result: MoveResult = {
        move,
        state: {
          ...getChessboardState(chess),
          isPromotion: !!promotionPiece,
        },
      };
      callbacks.onMove(result);
    }

    return move;
  };

  const isPromotionMove = (from: Square, to: Square): boolean => {
    const piece = chess.get(from);
    if (!piece || piece.type !== 'p') return false;

    const targetRank = to[1];
    if (piece.color === 'w' && targetRank === '8') return true;
    if (piece.color === 'b' && targetRank === '1') return true;

    return false;
  };

  const tryMove = (
    from: Square,
    to: Square,
    promotionPiece?: PieceSymbol
  ): Promise<Move | undefined> => {
    return new Promise((resolve) => {
      // Resolve only once the move animation has settled (executeMove's
      // completion fires on the JS thread). Invalid moves resolve right away.
      const attempt = (piece?: PieceSymbol) => {
        // The completion callback normally fires asynchronously (after the
        // spring settles), but test mocks run it synchronously inside
        // executeMove — before `move` is assigned. The flag covers both.
        let move: Move | null = null;
        let animationDone = false;
        move = executeMove(from, to, piece, () => {
          animationDone = true;
          if (move) resolve(move);
        });
        if (!move) {
          resolve(undefined);
        } else if (animationDone) {
          resolve(move);
        }
      };

      // Check if this is a promotion
      if (isPromotionMove(from, to)) {
        // If promotion piece is provided programmatically, use it directly
        if (promotionPiece) {
          attempt(promotionPiece);
        } else if (callbacks.onPromotionRequired) {
          callbacks.onPromotionRequired({
            from,
            to,
            color: chess.turn(),
            complete: (piece: PieceSymbol) => {
              attempt(piece);
            },
          });
        } else {
          // Default to queen if no promotion handler
          attempt('q');
        }
      } else {
        attempt();
      }
    });
  };

  const selectPiece = (square: Square) => {
    const piece = chess.get(square);

    // Can only select own pieces
    if (!piece || piece.color !== chess.turn()) {
      boardState.selectedSquare.set(null);
      boardState.validMoves.set([]);
      return;
    }

    boardState.selectedSquare.set(square);

    // Get valid moves for this piece
    const moves = chess.moves({ square, verbose: true });
    boardState.validMoves.set(moves.map((m) => m.to));
  };

  const resetBoard = (
    fen?: string,
    opts?: {
      // Animate the piece that ends on `to` sliding in from `from` (e.g. when
      // stepping through a game's history). Caller supplies the move; only a
      // single piece is animated.
      slide?: { from: Square; to: Square };
      // From/to squares to highlight as the last move (the move that produced
      // this position). Pass null to clear.
      lastMove?: { from: Square; to: Square } | null;
    }
  ) => {
    if (fen) {
      try {
        chess.load(fen);
      } catch {
        // Invalid FEN — leave the chess instance untouched and bail out so
        // the board state stays consistent with what's actually on screen.
        return;
      }
    } else {
      chess.reset();
    }

    const slide = opts?.slide;
    const lastMove = opts?.lastMove ?? null;
    const board = chess.board();

    // Update every square. When `slide` is given, the piece landing on
    // `slide.to` starts at `slide.from` and springs home — so stepping through
    // a game's history animates the moved piece instead of snapping.
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const colChar = String.fromCharCode('a'.charCodeAt(0) + col);
        const rowNum = 8 - row;
        const square = `${colChar}${rowNum}` as Square;
        const sq = boardState.squares[square];

        const piece = board[row][col];
        sq.piece.set(
          piece ? (`${piece.color}${piece.type}` as PieceCode) : null
        );
        sq.scale.set(1);
        sq.lastMove.set(
          !!lastMove && (square === lastMove.from || square === lastMove.to)
        );
        sq.inCheck.set(false);

        const pos = squareToPosition(square, pieceSize, flipped);
        if (slide && square === slide.to) {
          const fromPos = squareToPosition(slide.from, pieceSize, flipped);
          sq.zIndex.set(100);
          sq.translateX.set(fromPos.x);
          sq.translateY.set(fromPos.y);
          // zIndex drop rides the axis that actually travels (a no-travel
          // spring settles instantly — see commitMove in executeMove).
          const slidesVertically = pos.y !== fromPos.y;
          const dropZIndex = () => {
            'worklet';
            sq.zIndex.set(0);
          };
          sq.translateX.set(
            withSpring(
              pos.x,
              animations.move,
              slidesVertically ? undefined : dropZIndex
            )
          );
          sq.translateY.set(
            withSpring(
              pos.y,
              animations.move,
              slidesVertically ? dropZIndex : undefined
            )
          );
        } else {
          sq.translateX.set(pos.x);
          sq.translateY.set(pos.y);
          sq.zIndex.set(0);
        }
      }
    }

    // Reset other state
    boardState.turn.set(chess.turn());
    boardState.selectedSquare.set(null);
    boardState.validMoves.set([]);
    boardState.lastMove.set(lastMove);

    // Check / checkmate highlight for the resulting position.
    const isInCheck = chess.isCheck();
    const kingSquare =
      isInCheck || chess.isCheckmate()
        ? findKingSquare(chess, chess.turn())
        : null;
    if (kingSquare) {
      boardState.squares[kingSquare].inCheck.set(true);
    }
    boardState.isCheck.set(isInCheck);
    boardState.kingInCheckSquare.set(kingSquare);

    // Clear highlights
    for (const square of Object.keys(boardState.highlights) as Square[]) {
      boardState.highlights[square].color.set(null);
    }

    // Reset shader effect SharedValues so a fresh game's first check or
    // checkmate doesn't trigger a ripple at the previous game's king
    // square (centerX/centerY were last written by triggerEffect).
    if (callbacks.effectSharedValues) {
      callbacks.effectSharedValues.centerX.set(0);
      callbacks.effectSharedValues.centerY.set(0);
      callbacks.effectSharedValues.progress.set(0);
      callbacks.effectSharedValues.trigger.set('');
    }
  };

  const undo = (): Move | null => {
    const move = chess.undo();
    if (!move) return null;

    // Reset the board, restoring the last-move highlight to the move that now
    // sits at the end of the history (rather than clearing it).
    const history = chess.history({ verbose: true });
    const prev = history[history.length - 1];
    resetBoard(
      chess.fen(),
      prev ? { lastMove: { from: prev.from, to: prev.to } } : undefined
    );

    return move;
  };

  return {
    executeMove,
    tryMove,
    selectPiece,
    isPromotionMove,
    resetBoard,
    undo,
  };
};

export type MoveExecutor = ReturnType<typeof createMoveExecutor>;
