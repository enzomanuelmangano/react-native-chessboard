import { Chess } from 'chess.js';

// Helper to safely try a move (chess.js v1.0 throws on invalid moves)
const tryMove = (chess: Chess, move: { from: string; to: string; promotion?: string }) => {
  try {
    return chess.move(move);
  } catch {
    return null;
  }
};

describe('Chess Move Validation', () => {
  describe('basic moves', () => {
    it('allows legal pawn moves', () => {
      const chess = new Chess();

      expect(chess.move({ from: 'e2', to: 'e4' })).toBeTruthy();
      expect(chess.move({ from: 'e7', to: 'e5' })).toBeTruthy();
    });

    it('rejects illegal moves', () => {
      const chess = new Chess();

      // Pawn can't move 3 squares
      expect(tryMove(chess, { from: 'e2', to: 'e5' })).toBeNull();

      // Knight can't move like a bishop
      expect(tryMove(chess, { from: 'g1', to: 'f2' })).toBeNull();
    });

    it('prevents moving opponent pieces', () => {
      const chess = new Chess();

      // White to move, can't move black pawn
      expect(tryMove(chess, { from: 'e7', to: 'e5' })).toBeNull();
    });
  });

  describe('castling', () => {
    it('allows kingside castling when legal', () => {
      const chess = new Chess('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');

      const move = chess.move({ from: 'e1', to: 'g1' });
      expect(move).toBeTruthy();
      expect(move?.san).toBe('O-O'); // Kingside castling notation
    });

    it('allows queenside castling when legal', () => {
      const chess = new Chess('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');

      const move = chess.move({ from: 'e1', to: 'c1' });
      expect(move).toBeTruthy();
      expect(move?.san).toBe('O-O-O'); // Queenside castling notation
    });

    it('prevents castling through check', () => {
      // Rook on e8 attacks e1 (king in check), black king on h8
      const chess = new Chess('4r2k/8/8/8/8/8/8/R3K2R w KQ - 0 1');

      // King is in check, can't castle
      expect(tryMove(chess, { from: 'e1', to: 'g1' })).toBeNull();
    });

    it('prevents castling when no castling rights', () => {
      const chess = new Chess('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w - - 0 1');

      // No castling rights (indicated by '-')
      expect(tryMove(chess, { from: 'e1', to: 'g1' })).toBeNull();
    });
  });

  describe('en passant', () => {
    it('allows en passant capture', () => {
      // White pawn on e5, black just played d7-d5
      const chess = new Chess('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3');

      const move = chess.move({ from: 'e5', to: 'd6' });
      expect(move).toBeTruthy();
      expect(move?.san).toBe('exd6'); // En passant capture notation
      // After en passant, the captured pawn on d5 should be gone
      expect(chess.get('d5')).toBeFalsy();
    });

    it('only allows en passant immediately after double pawn push', () => {
      // Same position but no en passant square
      const chess = new Chess('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3');

      // No en passant available (diagonal capture would require a piece there)
      expect(tryMove(chess, { from: 'e5', to: 'd6' })).toBeNull();
    });
  });

  describe('pawn promotion', () => {
    it('promotes pawn to queen', () => {
      const chess = new Chess('8/P7/8/8/8/8/8/4K2k w - - 0 1');

      const move = chess.move({ from: 'a7', to: 'a8', promotion: 'q' });
      expect(move).toBeTruthy();
      expect(move?.promotion).toBe('q');
      expect(move?.san).toBe('a8=Q+');
    });

    it('promotes pawn to knight', () => {
      const chess = new Chess('8/P7/8/8/8/8/8/4K2k w - - 0 1');

      const move = chess.move({ from: 'a7', to: 'a8', promotion: 'n' });
      expect(move).toBeTruthy();
      expect(move?.promotion).toBe('n');
    });

    it('promotes pawn with capture', () => {
      const chess = new Chess('1n6/P7/8/8/8/8/8/4K2k w - - 0 1');

      const move = chess.move({ from: 'a7', to: 'b8', promotion: 'q' });
      expect(move).toBeTruthy();
      expect(move?.captured).toBe('n');
      expect(move?.promotion).toBe('q');
    });
  });

  describe('captures', () => {
    it('detects capture flag', () => {
      const chess = new Chess();
      chess.move('e4');
      chess.move('d5');

      const move = chess.move({ from: 'e4', to: 'd5' });
      expect(move).toBeTruthy();
      expect(move?.captured).toBe('p');
    });

    it('prevents capturing own pieces', () => {
      const chess = new Chess();
      chess.move('e4');
      chess.move('e5');
      chess.move('Bc4');
      chess.move('Nc6');

      // Bishop can't capture own pawn on f7 - wait, f7 is black's pawn
      // Let's try: Bishop on c4 can't move to d3 if we put a piece there
      chess.move('d3'); // Now there's a white pawn on d3
      chess.move('Nf6');

      // Bishop can't capture own pawn on d3
      expect(tryMove(chess, { from: 'c4', to: 'd3' })).toBeNull();
    });
  });

  describe('check and checkmate', () => {
    it('requires moving out of check', () => {
      // Set up a position where black is in check
      const chess = new Chess();
      chess.move('e4');
      chess.move('e5');
      chess.move('Qh5');
      chess.move('Nc6');
      chess.move('Qxf7'); // Check!

      // Black must respond to check - King is only legal move here
      // a6 would not address the check
      expect(chess.isCheck()).toBe(true);

      // Only king moves or blocking moves are legal
      const legalMoves = chess.moves({ verbose: true });
      expect(legalMoves.every(m => m.piece === 'k')).toBe(true);
    });

    it('detects checkmate correctly', () => {
      const chess = new Chess();
      chess.move('e4');
      chess.move('e5');
      chess.move('Bc4');
      chess.move('Nc6');
      chess.move('Qh5');
      chess.move('Nf6');
      chess.move('Qxf7');

      expect(chess.isCheckmate()).toBe(true);
      expect(chess.isGameOver()).toBe(true);
    });
  });

  describe('undo', () => {
    it('undoes the last move', () => {
      const chess = new Chess();
      const initialFen = chess.fen();

      chess.move('e4');
      expect(chess.fen()).not.toBe(initialFen);

      const undone = chess.undo();
      expect(undone).toBeTruthy();
      expect(undone?.san).toBe('e4');
      expect(chess.fen()).toBe(initialFen);
    });

    it('returns null when no moves to undo', () => {
      const chess = new Chess();
      expect(chess.undo()).toBeNull();
    });

    it('restores captured piece after undo', () => {
      const chess = new Chess();
      chess.move('e4');
      chess.move('d5');

      // d5 has black pawn before capture
      expect(chess.get('d5')).toEqual({ type: 'p', color: 'b' });

      chess.move('exd5');

      // After capture, white pawn is on d5
      expect(chess.get('d5')).toEqual({ type: 'p', color: 'w' });

      chess.undo();

      // After undo, black pawn is back on d5
      expect(chess.get('d5')).toEqual({ type: 'p', color: 'b' });
    });
  });
});
