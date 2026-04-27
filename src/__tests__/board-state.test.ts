import { squareToPosition, positionToSquare } from '../state/use-board-state';

describe('Board Position Utilities', () => {
  const PIECE_SIZE = 50;

  describe('squareToPosition', () => {
    it('converts a1 to bottom-left position', () => {
      const pos = squareToPosition('a1', PIECE_SIZE);
      expect(pos).toEqual({ x: 0, y: 350 }); // row 7 (0-indexed from top)
    });

    it('converts h8 to top-right position', () => {
      const pos = squareToPosition('h8', PIECE_SIZE);
      expect(pos).toEqual({ x: 350, y: 0 }); // row 0, col 7
    });

    it('converts e4 to center-ish position', () => {
      const pos = squareToPosition('e4', PIECE_SIZE);
      expect(pos).toEqual({ x: 200, y: 200 }); // col 4, row 4
    });

    it('converts d5 correctly', () => {
      const pos = squareToPosition('d5', PIECE_SIZE);
      expect(pos).toEqual({ x: 150, y: 150 }); // col 3, row 3
    });
  });

  describe('positionToSquare', () => {
    it('converts bottom-left to a1', () => {
      const square = positionToSquare(25, 375, PIECE_SIZE);
      expect(square).toBe('a1');
    });

    it('converts top-right to h8', () => {
      const square = positionToSquare(375, 25, PIECE_SIZE);
      expect(square).toBe('h8');
    });

    it('converts center position to e4', () => {
      const square = positionToSquare(225, 225, PIECE_SIZE);
      expect(square).toBe('e4');
    });

    it('handles edge of square correctly', () => {
      // Position at start of e4 square
      const square = positionToSquare(200, 200, PIECE_SIZE);
      expect(square).toBe('e4');
    });
  });

  describe('roundtrip conversion', () => {
    const squares = ['a1', 'a8', 'h1', 'h8', 'e4', 'd5', 'c3', 'f6'];

    squares.forEach((square) => {
      it(`converts ${square} to position and back`, () => {
        const pos = squareToPosition(square as any, PIECE_SIZE);
        // Add half piece size to get center of square
        const result = positionToSquare(
          pos.x + PIECE_SIZE / 2,
          pos.y + PIECE_SIZE / 2,
          PIECE_SIZE
        );
        expect(result).toBe(square);
      });
    });
  });
});
