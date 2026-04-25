import { withTiming, runOnJS, Easing } from 'react-native-reanimated';
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
  const { pieceSize, durations, colors } = config;
  const animationConfig = {
    duration: durations.move,
    easing: Easing.out(Easing.quad),
  };

  const updateHighlightsAfterMove = (from: Square, to: Square) => {
    'worklet';
    // Clear all custom highlights
    // (we keep this simple - only highlight last move)
    boardState.lastMove.value = { from, to };

    // Check for check/checkmate
    const isInCheck = chess.isCheck();
    boardState.isCheck.value = isInCheck;

    if (isInCheck || chess.isCheckmate()) {
      const turn = chess.turn();
      const kingSquare = findKingSquare(chess, turn);
      boardState.kingInCheckSquare.value = kingSquare;
    } else {
      boardState.kingInCheckSquare.value = null;
    }
  };

  const animatePieceToSquare = (
    fromSquare: Square,
    toSquare: Square,
    onComplete?: () => void
  ) => {
    'worklet';
    const fromState = boardState.squares[fromSquare];
    const toPos = squareToPosition(toSquare, pieceSize);

    fromState.translateX.value = withTiming(toPos.x, animationConfig);
    fromState.translateY.value = withTiming(toPos.y, animationConfig, () => {
      if (onComplete) {
        runOnJS(onComplete)();
      }
    });
  };

  const executeMove = (
    from: Square,
    to: Square,
    promotionPiece?: PieceSymbol
  ): Move | null => {
    // Validate and execute the move in chess.js
    const move = chess.move({
      from,
      to,
      promotion: promotionPiece,
    });

    if (!move) return null;

    const fromState = boardState.squares[from];
    const toState = boardState.squares[to];
    const movingPiece = fromState.piece.value;

    // Handle capture - clear target square piece
    if (move.captured) {
      toState.piece.value = null;
    }

    // Animate the piece
    const toPos = squareToPosition(to, pieceSize);

    // Raise the moving piece
    fromState.zIndex.value = 100;

    fromState.translateX.value = withTiming(toPos.x, animationConfig);
    fromState.translateY.value = withTiming(toPos.y, animationConfig, () => {
      'worklet';
      // Move complete - update piece positions
      toState.piece.value = promotionPiece
        ? (`${move.color}${promotionPiece}` as PieceCode)
        : movingPiece;
      fromState.piece.value = null;

      // Reset position to original square for future use
      const fromPos = squareToPosition(from, pieceSize);
      fromState.translateX.value = fromPos.x;
      fromState.translateY.value = fromPos.y;
      fromState.zIndex.value = 0;
    });

    // Handle castling - move the rook
    if (move.flags.includes('k') || move.flags.includes('q')) {
      const isKingside = move.flags.includes('k');
      const rank = move.color === 'w' ? '1' : '8';

      const rookFrom = (isKingside ? 'h' : 'a') + rank as Square;
      const rookTo = (isKingside ? 'f' : 'd') + rank as Square;

      const rookFromState = boardState.squares[rookFrom];
      const rookToState = boardState.squares[rookTo];
      const rookPiece = rookFromState.piece.value;

      const rookToPos = squareToPosition(rookTo, pieceSize);

      rookFromState.translateX.value = withTiming(
        rookToPos.x,
        animationConfig
      );
      rookFromState.translateY.value = withTiming(
        rookToPos.y,
        animationConfig,
        () => {
          'worklet';
          rookToState.piece.value = rookPiece;
          rookFromState.piece.value = null;

          const rookFromPos = squareToPosition(rookFrom, pieceSize);
          rookFromState.translateX.value = rookFromPos.x;
          rookFromState.translateY.value = rookFromPos.y;
        }
      );
    }

    // Handle en passant - remove the captured pawn
    if (move.flags.includes('e')) {
      const capturedPawnFile = to[0];
      const capturedPawnRank = from[1];
      const capturedPawnSquare = (capturedPawnFile + capturedPawnRank) as Square;
      boardState.squares[capturedPawnSquare].piece.value = null;
    }

    // Update board state
    boardState.turn.value = chess.turn();
    boardState.selectedSquare.value = null;
    boardState.validMoves.value = [];
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
    to: Square
  ): Promise<Move | undefined> => {
    return new Promise((resolve) => {
      // Check if this is a promotion
      if (isPromotionMove(from, to)) {
        if (callbacks.onPromotionRequired) {
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
    'worklet';
    const piece = chess.get(square);

    // Can only select own pieces
    if (!piece || piece.color !== chess.turn()) {
      boardState.selectedSquare.value = null;
      boardState.validMoves.value = [];
      return;
    }

    boardState.selectedSquare.value = square;

    // Get valid moves for this piece
    const moves = chess.moves({ square, verbose: true });
    boardState.validMoves.value = moves.map((m) => m.to);
  };

  const resetBoard = (fen?: string) => {
    if (fen) {
      chess.load(fen);
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

        boardState.squares[square].piece.value = pieceCode;

        // Reset position
        const pos = squareToPosition(square, pieceSize);
        boardState.squares[square].translateX.value = pos.x;
        boardState.squares[square].translateY.value = pos.y;
        boardState.squares[square].scale.value = 1;
        boardState.squares[square].zIndex.value = 0;
      }
    }

    // Reset other state
    boardState.turn.value = chess.turn();
    boardState.selectedSquare.value = null;
    boardState.validMoves.value = [];
    boardState.lastMove.value = null;
    boardState.isCheck.value = false;
    boardState.kingInCheckSquare.value = null;

    // Clear highlights
    for (const square of Object.keys(boardState.highlights) as Square[]) {
      boardState.highlights[square].color.value = null;
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
    animatePieceToSquare,
  };
};

export type MoveExecutor = ReturnType<typeof createMoveExecutor>;
