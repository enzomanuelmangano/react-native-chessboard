import { withSpring } from 'react-native-reanimated';
import type { Chess, Move, Square, PieceSymbol } from 'chess.js';
import type { BoardState, PieceCode } from './types';
import { squareToPosition } from './use-board-state';
import type { BoardConfig } from './types';
import { getChessboardState, ChessboardState } from '../helpers/get-chessboard-state';

export type MoveResult = {
  move: Move;
  state: ChessboardState & { isPromotion: boolean };
};

type MoveCallbacks = {
  onMove?: (result: MoveResult) => void;
  onPromotionRequired?: (info: {
    from: Square;
    to: Square;
    color: 'w' | 'b';
    complete: (piece: PieceSymbol) => void;
  }) => void;
};

const findKingSquare = (chess: Chess, color: 'w' | 'b'): Square | null => {
  const board = chess.board();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'k' && piece.color === color) {
        const colChar = String.fromCharCode('a'.charCodeAt(0) + col);
        const rowNum = 8 - row;
        return `${colChar}${rowNum}` as Square;
      }
    }
  }
  return null;
};

export const createMoveExecutor = (
  chess: Chess,
  boardState: BoardState,
  config: BoardConfig,
  callbacks: MoveCallbacks
) => {
  const { pieceSize, animations, flipped } = config;

  const updateHighlightsAfterMove = (from: Square, to: Square) => {
    // Clear all custom highlights
    // (we keep this simple - only highlight last move)
    boardState.lastMove.set({ from, to });

    // Check for check/checkmate
    const isInCheck = chess.isCheck();
    boardState.isCheck.set(isInCheck);

    if (isInCheck || chess.isCheckmate()) {
      const turn = chess.turn();
      const kingSquare = findKingSquare(chess, turn);
      boardState.kingInCheckSquare.set(kingSquare);
    } else {
      boardState.kingInCheckSquare.set(null);
    }
  };

  const executeMove = (
    from: Square,
    to: Square,
    promotionPiece?: PieceSymbol
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

    fromState.translateX.set(withSpring(toPos.x, animations.move));
    fromState.translateY.set(withSpring(toPos.y, animations.move, () => {
      'worklet';
      // Move complete - update piece positions
      toState.piece.set(finalPieceCode);
      fromState.piece.set(null);

      // Reset position to original square for future use
      fromState.translateX.set(fromPos.x);
      fromState.translateY.set(fromPos.y);
      fromState.zIndex.set(0);
    }));

    // Handle castling - move the rook
    if (move.flags.includes('k') || move.flags.includes('q')) {
      const isKingside = move.flags.includes('k');
      const rank = move.color === 'w' ? '1' : '8';

      const rookFrom = (isKingside ? 'h' : 'a') + rank as Square;
      const rookTo = (isKingside ? 'f' : 'd') + rank as Square;

      const rookFromState = boardState.squares[rookFrom];
      const rookToState = boardState.squares[rookTo];
      const rookPiece = rookFromState.piece.get();

      const rookToPos = squareToPosition(rookTo, pieceSize, flipped);
      const rookFromPos = squareToPosition(rookFrom, pieceSize, flipped);

      rookFromState.translateX.set(withSpring(rookToPos.x, animations.move));
      rookFromState.translateY.set(withSpring(
        rookToPos.y,
        animations.move,
        () => {
          'worklet';
          rookToState.piece.set(rookPiece);
          rookFromState.piece.set(null);

          rookFromState.translateX.set(rookFromPos.x);
          rookFromState.translateY.set(rookFromPos.y);
        }
      ));
    }

    // Handle en passant - remove the captured pawn
    if (move.flags.includes('e')) {
      const capturedPawnFile = to[0];
      const capturedPawnRank = from[1];
      const capturedPawnSquare = (capturedPawnFile + capturedPawnRank) as Square;
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
      // Check if this is a promotion
      if (isPromotionMove(from, to)) {
        // If promotion piece is provided programmatically, use it directly
        if (promotionPiece) {
          const move = executeMove(from, to, promotionPiece);
          resolve(move || undefined);
        } else if (callbacks.onPromotionRequired) {
          callbacks.onPromotionRequired({
            from,
            to,
            color: chess.turn(),
            complete: (piece: PieceSymbol) => {
              const move = executeMove(from, to, piece);
              resolve(move || undefined);
            },
          });
        } else {
          // Default to queen if no promotion handler
          const move = executeMove(from, to, 'q');
          resolve(move || undefined);
        }
      } else {
        const move = executeMove(from, to);
        resolve(move || undefined);
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

  const resetBoard = (fen?: string) => {
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

    // Update all square pieces
    const board = chess.board();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const colChar = String.fromCharCode('a'.charCodeAt(0) + col);
        const rowNum = 8 - row;
        const square = `${colChar}${rowNum}` as Square;

        const piece = board[row][col];
        const pieceCode = piece
          ? (`${piece.color}${piece.type}` as PieceCode)
          : null;

        boardState.squares[square].piece.set(pieceCode);

        // Reset position
        const pos = squareToPosition(square, pieceSize, flipped);
        boardState.squares[square].translateX.set(pos.x);
        boardState.squares[square].translateY.set(pos.y);
        boardState.squares[square].scale.set(1);
        boardState.squares[square].zIndex.set(0);
      }
    }

    // Reset other state
    boardState.turn.set(chess.turn());
    boardState.selectedSquare.set(null);
    boardState.validMoves.set([]);
    boardState.lastMove.set(null);
    boardState.isCheck.set(false);
    boardState.kingInCheckSquare.set(null);

    // Clear highlights
    for (const square of Object.keys(boardState.highlights) as Square[]) {
      boardState.highlights[square].color.set(null);
    }
  };

  const undo = (): Move | null => {
    const move = chess.undo();
    if (!move) return null;

    // Reset the board to current state
    resetBoard(chess.fen());

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
