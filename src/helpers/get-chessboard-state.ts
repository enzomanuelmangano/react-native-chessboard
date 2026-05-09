import type { Chess, Move } from 'chess.js';

export type ChessboardState = {
  readonly isCheck: boolean;
  readonly isCheckmate: boolean;
  readonly isDraw: boolean;
  readonly isStalemate: boolean;
  readonly isThreefoldRepetition: boolean;
  readonly isInsufficientMaterial: boolean;
  readonly isGameOver: boolean;
  readonly fen: string;
  readonly history: ReadonlyArray<Move>;
};

export const getChessboardState = (chess: Chess): ChessboardState => {
  return {
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isDraw: chess.isDraw(),
    isStalemate: chess.isStalemate(),
    isThreefoldRepetition: chess.isThreefoldRepetition(),
    isInsufficientMaterial: chess.isInsufficientMaterial(),
    isGameOver: chess.isGameOver(),
    fen: chess.fen(),
    history: chess.history({ verbose: true }),
  };
};
