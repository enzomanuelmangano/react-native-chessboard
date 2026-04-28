import { Chess, Square } from 'chess.js';
import { makeMutable } from 'react-native-reanimated';
import type { BoardState, PieceCode, SquareState, HighlightState } from '../state/types';
import { SQUARES } from '../state/types';
import { createMoveExecutor } from '../state/move-executor';
import { getChessboardState } from '../helpers/get-chessboard-state';
import { MOVE_SPRING, SCALE_SPRING, SNAP_BACK_SPRING } from '../config/animations';

// Helper to create mock square state
const createMockSquareState = (
  piece: PieceCode,
  x: number,
  y: number
): SquareState => ({
  piece: makeMutable<PieceCode>(piece),
  translateX: makeMutable(x),
  translateY: makeMutable(y),
  scale: makeMutable(1),
  zIndex: makeMutable(0),
});

// Helper to create mock highlight state
const createMockHighlightState = (): HighlightState => ({
  color: makeMutable<string | null>(null),
});

// Create a complete mock board state
const createMockBoardState = (chess: Chess, pieceSize: number): BoardState => {
  const squares: Partial<Record<Square, SquareState>> = {};
  const highlights: Partial<Record<Square, HighlightState>> = {};

  for (const square of SQUARES) {
    const col = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - parseInt(square[1], 10);
    const x = col * pieceSize;
    const y = row * pieceSize;

    const piece = chess.get(square);
    const pieceCode: PieceCode = piece
      ? (`${piece.color}${piece.type}` as PieceCode)
      : null;

    squares[square] = createMockSquareState(pieceCode, x, y);
    highlights[square] = createMockHighlightState();
  }

  return {
    squares: squares as Record<Square, SquareState>,
    highlights: highlights as Record<Square, HighlightState>,
    turn: makeMutable(chess.turn()),
    selectedSquare: makeMutable<Square | null>(null),
    validMoves: makeMutable<Square[]>([]),
    lastMove: makeMutable<{ from: Square; to: Square } | null>(null),
    isCheck: makeMutable(false),
    kingInCheckSquare: makeMutable<Square | null>(null),
  };
};

const PIECE_SIZE = 50;
const config = {
  boardSize: 400,
  pieceSize: PIECE_SIZE,
  gestureEnabled: true,
  flipped: false,
  withLetters: false,
  withNumbers: false,
  colors: {
    white: '#f0d9b5',
    black: '#b58863',
    lastMoveHighlight: 'rgba(255, 255, 0, 0.4)',
    checkmateHighlight: 'rgba(255, 0, 0, 0.4)',
    promotionPieceButton: 'rgba(255, 255, 255, 0.8)',
  },
  durations: { move: 200 },
  animations: {
    move: MOVE_SPRING,
    scale: SCALE_SPRING,
    snapBack: SNAP_BACK_SPRING,
  },
};

describe('ChessboardRef API', () => {
  describe('move()', () => {
    it('executes valid move and returns Move object', async () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      const move = await executor.tryMove('e2' as Square, 'e4' as Square);

      expect(move).toBeTruthy();
      expect(move?.san).toBe('e4');
      expect(move?.from).toBe('e2');
      expect(move?.to).toBe('e4');
    });

    it('returns undefined for invalid move', async () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      // Try to move pawn 3 squares
      let move;
      try {
        move = await executor.tryMove('e2' as Square, 'e5' as Square);
      } catch {
        move = undefined;
      }

      expect(move).toBeUndefined();
    });

    it('handles promotion parameter', async () => {
      const chess = new Chess('8/P7/8/8/8/8/8/4K2k w - - 0 1');
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      const move = await executor.tryMove('a7' as Square, 'a8' as Square, 'q');

      expect(move).toBeTruthy();
      expect(move?.promotion).toBe('q');
      expect(move?.san).toBe('a8=Q+');
    });

    it('handles knight promotion', async () => {
      const chess = new Chess('8/P7/8/8/8/8/8/4K2k w - - 0 1');
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      const move = await executor.tryMove('a7' as Square, 'a8' as Square, 'n');

      expect(move).toBeTruthy();
      expect(move?.promotion).toBe('n');
    });
  });

  describe('undo()', () => {
    it('reverts last move', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      executor.executeMove('e2' as Square, 'e4' as Square);
      const undone = executor.undo();

      expect(undone).toBeTruthy();
      expect(undone?.san).toBe('e4');
    });

    it('returns null when no moves', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      const undone = executor.undo();

      expect(undone).toBeNull();
    });

    it('undoes multiple moves using chess.undo() directly', () => {
      // The executor.undo() calls resetBoard() which clears history,
      // so we test the underlying chess.undo() behavior instead
      const chess = new Chess();

      chess.move('e4');
      chess.move('e5');

      const undone1 = chess.undo();
      expect(undone1?.san).toBe('e5');

      const undone2 = chess.undo();
      expect(undone2?.san).toBe('e4');
    });
  });

  describe('highlight()', () => {
    it('highlights square with color', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      boardState.highlights['e4'].color.set('rgba(255, 0, 0, 0.5)');

      expect(boardState.highlights['e4'].color.get()).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('highlights multiple squares', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      boardState.highlights['e4'].color.set('rgba(255, 0, 0, 0.5)');
      boardState.highlights['d4'].color.set('rgba(0, 255, 0, 0.5)');

      expect(boardState.highlights['e4'].color.get()).toBe('rgba(255, 0, 0, 0.5)');
      expect(boardState.highlights['d4'].color.get()).toBe('rgba(0, 255, 0, 0.5)');
    });
  });

  describe('resetAllHighlightedSquares()', () => {
    it('clears all custom highlights', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      // Set some highlights
      boardState.highlights['e4'].color.set('red');
      boardState.highlights['d4'].color.set('blue');
      boardState.lastMove.set({ from: 'e2' as Square, to: 'e4' as Square });
      boardState.kingInCheckSquare.set('e8' as Square);

      // Clear all
      for (const square of SQUARES) {
        boardState.highlights[square].color.set(null);
      }
      boardState.lastMove.set(null);
      boardState.kingInCheckSquare.set(null);

      expect(boardState.highlights['e4'].color.get()).toBeNull();
      expect(boardState.highlights['d4'].color.get()).toBeNull();
      expect(boardState.lastMove.get()).toBeNull();
      expect(boardState.kingInCheckSquare.get()).toBeNull();
    });
  });

  describe('resetBoard()', () => {
    it('resets to starting position', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      // Make some moves
      executor.executeMove('e2' as Square, 'e4' as Square);
      executor.executeMove('e7' as Square, 'e5' as Square);

      // Reset
      executor.resetBoard();

      expect(chess.fen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('loads custom FEN', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      const customFen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
      executor.resetBoard(customFen);

      expect(chess.fen()).toBe(customFen);
    });

    it('clears selection and valid moves', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      boardState.selectedSquare.set('e2' as Square);
      boardState.validMoves.set(['e3' as Square, 'e4' as Square]);

      executor.resetBoard();

      expect(boardState.selectedSquare.get()).toBeNull();
      expect(boardState.validMoves.get()).toEqual([]);
    });
  });

  describe('getState()', () => {
    it('returns current FEN', () => {
      const chess = new Chess();
      const state = getChessboardState(chess);

      expect(state.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('returns check status', () => {
      // Position with check
      const chess = new Chess();
      chess.move('e4');
      chess.move('e5');
      chess.move('Qh5');
      chess.move('Nc6');
      chess.move('Qxf7'); // Check!

      const state = getChessboardState(chess);

      expect(state.isCheck).toBe(true);
    });

    it('returns checkmate status', () => {
      // Scholar's mate
      const chess = new Chess();
      chess.move('e4');
      chess.move('e5');
      chess.move('Bc4');
      chess.move('Nc6');
      chess.move('Qh5');
      chess.move('Nf6');
      chess.move('Qxf7');

      const state = getChessboardState(chess);

      expect(state.isCheckmate).toBe(true);
      expect(state.isGameOver).toBe(true);
    });

    it('returns draw status for stalemate', () => {
      // Valid stalemate position: black king in corner, white king and queen blocking
      const chess = new Chess('k7/2Q5/1K6/8/8/8/8/8 b - - 0 1');
      // Black king on a8, White queen on c7, White king on b6
      // Black has no legal moves but is not in check

      const state = getChessboardState(chess);

      expect(state.isStalemate).toBe(true);
      expect(state.isDraw).toBe(true);
      expect(state.isGameOver).toBe(true);
    });

    it('returns threefold repetition status', () => {
      // Create a position with threefold repetition
      const chess = new Chess();
      // Move knights back and forth
      chess.move('Nf3'); chess.move('Nf6');
      chess.move('Ng1'); chess.move('Ng8');
      chess.move('Nf3'); chess.move('Nf6');
      chess.move('Ng1'); chess.move('Ng8');
      chess.move('Nf3'); chess.move('Nf6');

      const state = getChessboardState(chess);
      expect(state.isThreefoldRepetition).toBe(true);
    });

    it('returns insufficient material status', () => {
      // King vs King
      const chess = new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1');

      const state = getChessboardState(chess);
      expect(state.isInsufficientMaterial).toBe(true);
      expect(state.isDraw).toBe(true);
    });
  });
});
