import { getPieceSpriteRect } from '../assets/piece-images';

describe('Piece Sprite Sheet', () => {
  const CELL_SIZE = 128;

  describe('getPieceSpriteRect', () => {
    it('returns null for null piece type', () => {
      expect(getPieceSpriteRect(null)).toBeNull();
    });

    describe('white pieces (row 0)', () => {
      it('returns correct rect for white pawn', () => {
        const rect = getPieceSpriteRect('wp');
        expect(rect).not.toBeNull();
        expect(rect?.x).toBe(0);
        expect(rect?.y).toBe(0);
        expect(rect?.width).toBe(CELL_SIZE);
        expect(rect?.height).toBe(CELL_SIZE);
      });

      it('returns correct rect for white knight', () => {
        const rect = getPieceSpriteRect('wn');
        expect(rect).not.toBeNull();
        expect(rect?.x).toBe(CELL_SIZE * 1);
        expect(rect?.y).toBe(0);
      });

      it('returns correct rect for white bishop', () => {
        const rect = getPieceSpriteRect('wb');
        expect(rect).not.toBeNull();
        expect(rect?.x).toBe(CELL_SIZE * 2);
        expect(rect?.y).toBe(0);
      });

      it('returns correct rect for white rook', () => {
        const rect = getPieceSpriteRect('wr');
        expect(rect).not.toBeNull();
        expect(rect?.x).toBe(CELL_SIZE * 3);
        expect(rect?.y).toBe(0);
      });

      it('returns correct rect for white queen', () => {
        const rect = getPieceSpriteRect('wq');
        expect(rect).not.toBeNull();
        expect(rect?.x).toBe(CELL_SIZE * 4);
        expect(rect?.y).toBe(0);
      });

      it('returns correct rect for white king', () => {
        const rect = getPieceSpriteRect('wk');
        expect(rect).not.toBeNull();
        expect(rect?.x).toBe(CELL_SIZE * 5);
        expect(rect?.y).toBe(0);
      });
    });

    describe('black pieces (row 1)', () => {
      it('returns correct rect for black pawn', () => {
        const rect = getPieceSpriteRect('bp');
        expect(rect).not.toBeNull();
        expect(rect?.x).toBe(0);
        expect(rect?.y).toBe(CELL_SIZE);
      });

      it('returns correct rect for black knight', () => {
        const rect = getPieceSpriteRect('bn');
        expect(rect).not.toBeNull();
        expect(rect?.x).toBe(CELL_SIZE * 1);
        expect(rect?.y).toBe(CELL_SIZE);
      });

      it('returns correct rect for black bishop', () => {
        const rect = getPieceSpriteRect('bb');
        expect(rect).not.toBeNull();
        expect(rect?.x).toBe(CELL_SIZE * 2);
        expect(rect?.y).toBe(CELL_SIZE);
      });

      it('returns correct rect for black rook', () => {
        const rect = getPieceSpriteRect('br');
        expect(rect).not.toBeNull();
        expect(rect?.x).toBe(CELL_SIZE * 3);
        expect(rect?.y).toBe(CELL_SIZE);
      });

      it('returns correct rect for black queen', () => {
        const rect = getPieceSpriteRect('bq');
        expect(rect).not.toBeNull();
        expect(rect?.x).toBe(CELL_SIZE * 4);
        expect(rect?.y).toBe(CELL_SIZE);
      });

      it('returns correct rect for black king', () => {
        const rect = getPieceSpriteRect('bk');
        expect(rect).not.toBeNull();
        expect(rect?.x).toBe(CELL_SIZE * 5);
        expect(rect?.y).toBe(CELL_SIZE);
      });
    });

    describe('all rects have consistent dimensions', () => {
      const pieceTypes = [
        'wp',
        'wn',
        'wb',
        'wr',
        'wq',
        'wk',
        'bp',
        'bn',
        'bb',
        'br',
        'bq',
        'bk',
      ] as const;

      it.each(pieceTypes)('%s has correct width and height', (pieceType) => {
        const rect = getPieceSpriteRect(pieceType);
        expect(rect?.width).toBe(CELL_SIZE);
        expect(rect?.height).toBe(CELL_SIZE);
      });
    });

    describe('custom cell size', () => {
      it('scales rects correctly with custom cell size', () => {
        const customSize = 64;

        const wpRect = getPieceSpriteRect('wp', customSize);
        expect(wpRect?.width).toBe(customSize);
        expect(wpRect?.height).toBe(customSize);

        const wnRect = getPieceSpriteRect('wn', customSize);
        expect(wnRect?.x).toBe(customSize);
        expect(wnRect?.y).toBe(0);

        const bpRect = getPieceSpriteRect('bp', customSize);
        expect(bpRect?.x).toBe(0);
        expect(bpRect?.y).toBe(customSize);
      });
    });

    describe('sprite grid layout', () => {
      it('arranges pieces in 6x2 grid', () => {
        // Verify no piece exceeds grid bounds
        const pieceTypes = [
          'wp',
          'wn',
          'wb',
          'wr',
          'wq',
          'wk',
          'bp',
          'bn',
          'bb',
          'br',
          'bq',
          'bk',
        ] as const;

        const spriteWidth = CELL_SIZE * 6;
        const spriteHeight = CELL_SIZE * 2;

        for (const pieceType of pieceTypes) {
          const rect = getPieceSpriteRect(pieceType);
          expect(rect).not.toBeNull();
          if (rect) {
            expect(rect.x).toBeLessThan(spriteWidth);
            expect(rect.y).toBeLessThan(spriteHeight);
            expect(rect.x + rect.width).toBeLessThanOrEqual(spriteWidth);
            expect(rect.y + rect.height).toBeLessThanOrEqual(spriteHeight);
          }
        }
      });

      it('white pieces are on row 0, black pieces on row 1', () => {
        const whitePieces = ['wp', 'wn', 'wb', 'wr', 'wq', 'wk'] as const;
        const blackPieces = ['bp', 'bn', 'bb', 'br', 'bq', 'bk'] as const;

        for (const piece of whitePieces) {
          const rect = getPieceSpriteRect(piece);
          expect(rect?.y).toBe(0);
        }

        for (const piece of blackPieces) {
          const rect = getPieceSpriteRect(piece);
          expect(rect?.y).toBe(CELL_SIZE);
        }
      });
    });
  });
});
