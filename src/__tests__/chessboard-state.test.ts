import { Chess } from 'chess.js';
import { getChessboardState } from '../helpers/get-chessboard-state';

describe('getChessboardState', () => {
  describe('initial position', () => {
    it('returns correct initial state', () => {
      const chess = new Chess();
      const state = getChessboardState(chess);

      expect(state.isCheck).toBe(false);
      expect(state.isCheckmate).toBe(false);
      expect(state.isDraw).toBe(false);
      expect(state.isStalemate).toBe(false);
      expect(state.isGameOver).toBe(false);
      expect(state.isInsufficientMaterial).toBe(false);
      expect(state.isThreefoldRepetition).toBe(false);
      expect(state.fen).toBe(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      );
    });
  });

  describe('check detection', () => {
    it('detects check correctly', () => {
      // Play to a check position
      const chess = new Chess();
      chess.move('e4');
      chess.move('e5');
      chess.move('Qh5');
      chess.move('Nc6');
      chess.move('Qxf7'); // Check!

      const state = getChessboardState(chess);

      expect(state.isCheck).toBe(true);
      expect(state.isCheckmate).toBe(false); // King can move
      expect(state.isGameOver).toBe(false);
    });
  });

  describe('checkmate detection', () => {
    it('detects scholars mate', () => {
      const chess = new Chess();
      // Play Scholar's Mate
      chess.move('e4');
      chess.move('e5');
      chess.move('Bc4');
      chess.move('Nc6');
      chess.move('Qh5');
      chess.move('Nf6');
      chess.move('Qxf7');

      const state = getChessboardState(chess);

      expect(state.isCheck).toBe(true);
      expect(state.isCheckmate).toBe(true);
      expect(state.isGameOver).toBe(true);
    });

    it('detects fools mate', () => {
      const chess = new Chess();
      chess.move('f3');
      chess.move('e5');
      chess.move('g4');
      chess.move('Qh4');

      const state = getChessboardState(chess);

      expect(state.isCheckmate).toBe(true);
      expect(state.isGameOver).toBe(true);
    });
  });

  describe('stalemate detection', () => {
    it('detects stalemate', () => {
      // Classic stalemate: Black king on h8, white king on f7, white queen on g6
      // Black has no legal moves but is not in check
      const chess = new Chess('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1');
      const state = getChessboardState(chess);

      expect(state.isStalemate).toBe(true);
      expect(state.isDraw).toBe(true);
      expect(state.isGameOver).toBe(true);
      expect(state.isCheckmate).toBe(false);
    });
  });

  describe('draw detection', () => {
    it('detects insufficient material (K vs K)', () => {
      const chess = new Chess('k7/8/8/8/8/8/8/K7 w - - 0 1');
      const state = getChessboardState(chess);

      expect(state.isInsufficientMaterial).toBe(true);
      expect(state.isDraw).toBe(true);
      expect(state.isGameOver).toBe(true);
    });

    it('detects insufficient material (K+B vs K)', () => {
      const chess = new Chess('k7/8/8/8/8/8/8/KB6 w - - 0 1');
      const state = getChessboardState(chess);

      expect(state.isInsufficientMaterial).toBe(true);
    });

    it('detects insufficient material (K+N vs K)', () => {
      const chess = new Chess('k7/8/8/8/8/8/8/KN6 w - - 0 1');
      const state = getChessboardState(chess);

      expect(state.isInsufficientMaterial).toBe(true);
    });
  });

  describe('FEN tracking', () => {
    it('updates FEN after moves', () => {
      const chess = new Chess();
      const initialFen = getChessboardState(chess).fen;

      chess.move('e4');
      const afterE4 = getChessboardState(chess).fen;

      expect(afterE4).not.toBe(initialFen);
      expect(afterE4).toContain('4P3'); // Pawn on e4
    });
  });
});
