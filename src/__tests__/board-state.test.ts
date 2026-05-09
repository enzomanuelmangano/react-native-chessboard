import { squareToPosition, positionToSquare } from '../state/use-board-state';

describe('Board Position Utilities', () => {
  const PIECE_SIZE = 50;

  describe('squareToPosition (normal orientation)', () => {
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

  describe('positionToSquare (normal orientation)', () => {
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

  describe('squareToPosition (flipped orientation)', () => {
    it('converts a1 to top-right position when flipped', () => {
      const pos = squareToPosition('a1', PIECE_SIZE, true);
      // When flipped, a1 should be at top-right (col 7, row 0)
      expect(pos).toEqual({ x: 350, y: 0 });
    });

    it('converts h8 to bottom-left position when flipped', () => {
      const pos = squareToPosition('h8', PIECE_SIZE, true);
      // When flipped, h8 should be at bottom-left (col 0, row 7)
      expect(pos).toEqual({ x: 0, y: 350 });
    });

    it('converts a8 to bottom-right position when flipped', () => {
      const pos = squareToPosition('a8', PIECE_SIZE, true);
      // When flipped, a8 should be at bottom-right (col 7, row 7)
      expect(pos).toEqual({ x: 350, y: 350 });
    });

    it('converts h1 to top-left position when flipped', () => {
      const pos = squareToPosition('h1', PIECE_SIZE, true);
      // When flipped, h1 should be at top-left (col 0, row 0)
      expect(pos).toEqual({ x: 0, y: 0 });
    });

    it('converts e4 to mirrored position when flipped', () => {
      const pos = squareToPosition('e4', PIECE_SIZE, true);
      // e4 normal: col 4, row 4 -> flipped: col 3, row 3
      expect(pos).toEqual({ x: 150, y: 150 });
    });

    it('converts d5 to mirrored position when flipped', () => {
      const pos = squareToPosition('d5', PIECE_SIZE, true);
      // d5 normal: col 3, row 3 -> flipped: col 4, row 4
      expect(pos).toEqual({ x: 200, y: 200 });
    });
  });

  describe('positionToSquare (flipped orientation)', () => {
    it('converts top-right to a1 when flipped', () => {
      const square = positionToSquare(375, 25, PIECE_SIZE, true);
      expect(square).toBe('a1');
    });

    it('converts bottom-left to h8 when flipped', () => {
      const square = positionToSquare(25, 375, PIECE_SIZE, true);
      expect(square).toBe('h8');
    });

    it('converts top-left to h1 when flipped', () => {
      const square = positionToSquare(25, 25, PIECE_SIZE, true);
      expect(square).toBe('h1');
    });

    it('converts bottom-right to a8 when flipped', () => {
      const square = positionToSquare(375, 375, PIECE_SIZE, true);
      expect(square).toBe('a8');
    });

    it('converts mirrored center to e4 when flipped', () => {
      // e4 flipped position is col 3, row 3 -> x=175, y=175
      const square = positionToSquare(175, 175, PIECE_SIZE, true);
      expect(square).toBe('e4');
    });
  });

  describe('roundtrip conversion (normal)', () => {
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

  describe('roundtrip conversion (flipped)', () => {
    const squares = ['a1', 'a8', 'h1', 'h8', 'e4', 'd5', 'c3', 'f6'];

    squares.forEach((square) => {
      it(`converts ${square} to position and back when flipped`, () => {
        const pos = squareToPosition(square as any, PIECE_SIZE, true);
        // Add half piece size to get center of square
        const result = positionToSquare(
          pos.x + PIECE_SIZE / 2,
          pos.y + PIECE_SIZE / 2,
          PIECE_SIZE,
          true
        );
        expect(result).toBe(square);
      });
    });
  });

  describe('flipped vs normal position symmetry', () => {
    it('a1 normal position equals h8 flipped position', () => {
      const a1Normal = squareToPosition('a1', PIECE_SIZE, false);
      const h8Flipped = squareToPosition('h8', PIECE_SIZE, true);
      expect(a1Normal).toEqual(h8Flipped);
    });

    it('h1 normal position equals a8 flipped position', () => {
      const h1Normal = squareToPosition('h1', PIECE_SIZE, false);
      const a8Flipped = squareToPosition('a8', PIECE_SIZE, true);
      expect(h1Normal).toEqual(a8Flipped);
    });

    it('a8 normal position equals h1 flipped position', () => {
      const a8Normal = squareToPosition('a8', PIECE_SIZE, false);
      const h1Flipped = squareToPosition('h1', PIECE_SIZE, true);
      expect(a8Normal).toEqual(h1Flipped);
    });

    it('h8 normal position equals a1 flipped position', () => {
      const h8Normal = squareToPosition('h8', PIECE_SIZE, false);
      const a1Flipped = squareToPosition('a1', PIECE_SIZE, true);
      expect(h8Normal).toEqual(a1Flipped);
    });
  });
});
