import type { Chess, Square } from 'chess.js';

export const findKingSquare = (
  chess: Chess,
  color: 'w' | 'b'
): Square | null => {
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
