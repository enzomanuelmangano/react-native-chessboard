"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getChessboardState = void 0;

const getChessboardState = chess => {
  return {
    in_check: chess.in_check(),
    in_checkmate: chess.in_checkmate(),
    in_draw: chess.in_draw(),
    in_stalemate: chess.in_stalemate(),
    in_threefold_repetition: chess.in_threefold_repetition(),
    insufficient_material: chess.insufficient_material(),
    game_over: chess.game_over(),
    fen: chess.fen()
  };
};

exports.getChessboardState = getChessboardState;
//# sourceMappingURL=get-chessboard-state.js.map