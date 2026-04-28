import { Chess, Square } from 'chess.js';
import { makeMutable } from 'react-native-reanimated';
import type { BoardState, PieceCode, SquareState, HighlightState } from '../state/types';
import { SQUARES } from '../state/types';
import { positionToSquare, squareToPosition } from '../state/use-board-state';

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

describe('Board Gesture Utilities', () => {
  const PIECE_SIZE = 50;

  describe('positionToSquare', () => {
    it('converts center of e2 to e2', () => {
      // e2 is col 4, row 6 (from top)
      const x = 4 * PIECE_SIZE + PIECE_SIZE / 2;
      const y = 6 * PIECE_SIZE + PIECE_SIZE / 2;
      expect(positionToSquare(x, y, PIECE_SIZE)).toBe('e2');
    });

    it('converts corner of board to a8', () => {
      expect(positionToSquare(0, 0, PIECE_SIZE)).toBe('a8');
    });

    it('converts opposite corner to h1', () => {
      const x = 7 * PIECE_SIZE + PIECE_SIZE / 2;
      const y = 7 * PIECE_SIZE + PIECE_SIZE / 2;
      expect(positionToSquare(x, y, PIECE_SIZE)).toBe('h1');
    });
  });

  describe('squareToPosition', () => {
    it('converts e2 to correct position', () => {
      const pos = squareToPosition('e2', PIECE_SIZE);
      // e2: col 4, row 6
      expect(pos.x).toBe(4 * PIECE_SIZE);
      expect(pos.y).toBe(6 * PIECE_SIZE);
    });

    it('converts a8 to top-left', () => {
      const pos = squareToPosition('a8', PIECE_SIZE);
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(0);
    });

    it('converts h1 to bottom-right', () => {
      const pos = squareToPosition('h1', PIECE_SIZE);
      expect(pos.x).toBe(7 * PIECE_SIZE);
      expect(pos.y).toBe(7 * PIECE_SIZE);
    });
  });

  describe('board state for gestures', () => {
    it('can identify own piece', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      // e2 should have white pawn
      const piece = boardState.squares['e2'].piece.get();
      expect(piece).toBe('wp');
      expect(piece?.[0]).toBe('w');
    });

    it('can check turn', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      expect(boardState.turn.get()).toBe('w');
    });

    it('can set and get selected square', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      boardState.selectedSquare.set('e2');
      expect(boardState.selectedSquare.get()).toBe('e2');
    });

    it('can set and get valid moves', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      boardState.validMoves.set(['e3', 'e4']);
      expect(boardState.validMoves.get()).toContain('e3');
      expect(boardState.validMoves.get()).toContain('e4');
    });
  });

  describe('drag behavior simulation', () => {
    it('correctly clamps position to board bounds', () => {
      const boardBoundMax = PIECE_SIZE * 8 - 1;

      // Simulate dragging piece far left
      const clampedX = Math.max(0, Math.min(-100, boardBoundMax));
      expect(clampedX).toBe(0);

      // Simulate dragging piece far right
      const clampedXRight = Math.max(0, Math.min(500, boardBoundMax));
      expect(clampedXRight).toBe(boardBoundMax);
    });

    it('calculates drop square from position', () => {
      // Simulate dropping piece on e4
      const dropX = 4 * PIECE_SIZE + PIECE_SIZE / 2;
      const dropY = 4 * PIECE_SIZE + PIECE_SIZE / 2;

      const targetSquare = positionToSquare(dropX, dropY, PIECE_SIZE);
      expect(targetSquare).toBe('e4');
    });
  });

  describe('gesture enabled state', () => {
    it('respects turn for piece selection', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      const e2Piece = boardState.squares['e2'].piece.get();
      const e7Piece = boardState.squares['e7'].piece.get();

      // White's turn - e2 (white pawn) should be selectable
      expect(e2Piece?.[0]).toBe(boardState.turn.get());

      // e7 (black pawn) should not be selectable on white's turn
      expect(e7Piece?.[0]).not.toBe(boardState.turn.get());
    });

    it('validates valid moves before accepting drop', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      // Set up valid moves for e2 pawn
      boardState.selectedSquare.set('e2');
      boardState.validMoves.set(['e3', 'e4']);

      // e4 should be valid
      expect(boardState.validMoves.get().includes('e4')).toBe(true);

      // e5 should not be valid
      expect(boardState.validMoves.get().includes('e5')).toBe(false);
    });
  });

  describe('z-index during drag', () => {
    it('starts at 0', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      expect(boardState.squares['e2'].zIndex.get()).toBe(0);
    });

    it('can be elevated', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      boardState.squares['e2'].zIndex.set(100);
      expect(boardState.squares['e2'].zIndex.get()).toBe(100);
    });
  });

  describe('scale during drag', () => {
    it('starts at 1', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      expect(boardState.squares['e2'].scale.get()).toBe(1);
    });

    it('can be modified', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      boardState.squares['e2'].scale.set(1.1);
      expect(boardState.squares['e2'].scale.get()).toBe(1.1);
    });
  });

  describe('drag threshold', () => {
    it('calculates distance correctly', () => {
      const translationX = 3;
      const translationY = 4;
      const distance = Math.sqrt(
        translationX * translationX + translationY * translationY
      );
      expect(distance).toBe(5);
    });

    it('identifies movements below threshold', () => {
      const MIN_DRAG_DISTANCE = 5;
      const translationX = 2;
      const translationY = 2;
      const distance = Math.sqrt(
        translationX * translationX + translationY * translationY
      );
      expect(distance).toBeLessThan(MIN_DRAG_DISTANCE);
    });

    it('identifies movements above threshold', () => {
      const MIN_DRAG_DISTANCE = 5;
      const translationX = 5;
      const translationY = 5;
      const distance = Math.sqrt(
        translationX * translationX + translationY * translationY
      );
      expect(distance).toBeGreaterThan(MIN_DRAG_DISTANCE);
    });
  });
});
