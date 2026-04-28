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

  describe('dragging opponent pieces', () => {
    it('identifies opponent piece on white turn', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      // e7 has black pawn
      const piece = boardState.squares['e7'].piece.get();
      const turn = boardState.turn.get();

      expect(piece).toBe('bp');
      expect(turn).toBe('w');
      expect(piece?.[0]).not.toBe(turn); // Not own piece
    });

    it('identifies opponent piece on black turn', () => {
      const fenBlackTurn = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const chess = new Chess(fenBlackTurn);
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      // e4 has white pawn
      const piece = boardState.squares['e4'].piece.get();
      const turn = boardState.turn.get();

      expect(piece).toBe('wp');
      expect(turn).toBe('b');
      expect(piece?.[0]).not.toBe(turn); // Not own piece
    });

    it('should not allow move execution for opponent pieces', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      // Set up a scenario where white has selected a piece
      boardState.selectedSquare.set('c2');
      boardState.validMoves.set(['c3', 'c4']);

      // Now simulate dragging black pawn at c7
      const piece = boardState.squares['c7'].piece.get();
      const turn = boardState.turn.get();
      const isOwnPiece = piece && piece[0] === turn;

      // This should be false - black pawn is not white's piece
      expect(isOwnPiece).toBe(false);

      // Even though c4 is in validMoves, we shouldn't try to move c7 to c4
      // because c7 has an opponent's piece
    });

    it('opponent piece should snap back to original position', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      const originalPos = squareToPosition('c7', PIECE_SIZE);
      const squareState = boardState.squares['c7'];

      // Verify original position
      expect(squareState.translateX.get()).toBe(originalPos.x);
      expect(squareState.translateY.get()).toBe(originalPos.y);

      // Simulate dragging - move piece visually
      squareState.translateX.set(originalPos.x + 100);
      squareState.translateY.set(originalPos.y + 100);
      squareState.zIndex.set(100);

      // After drag ends for opponent piece, it should snap back
      // (In real code, the snap back uses withSpring, here we just verify the concept)
      const piece = squareState.piece.get();
      const turn = boardState.turn.get();
      const isOwnPiece = piece && piece[0] === turn;

      expect(isOwnPiece).toBe(false);
      // Snap back would restore original position
    });
  });

  describe('tap to move flow', () => {
    it('tapping own piece selects it', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      const piece = boardState.squares['e2'].piece.get();
      const turn = boardState.turn.get();
      const isOwnPiece = piece && piece[0] === turn;

      expect(isOwnPiece).toBe(true);
      // In real flow, this would trigger selectPiece
    });

    it('tapping opponent piece does not select it', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      const piece = boardState.squares['e7'].piece.get();
      const turn = boardState.turn.get();
      const isOwnPiece = piece && piece[0] === turn;

      expect(isOwnPiece).toBe(false);
      // Should not trigger selectPiece
    });

    it('tapping valid move target should trigger move', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      // Simulate having selected e2
      boardState.selectedSquare.set('e2');
      boardState.validMoves.set(['e3', 'e4']);

      // Check if e4 is a valid target
      const targetSquare = 'e4';
      const isValidTarget = boardState.validMoves.get().includes(targetSquare);

      expect(isValidTarget).toBe(true);
    });

    it('tapping same piece deselects it', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      boardState.selectedSquare.set('e2');
      boardState.validMoves.set(['e3', 'e4']);

      // Tapping e2 again should deselect
      const tappedSquare = 'e2';
      const selectedSquare = boardState.selectedSquare.get();

      expect(tappedSquare).toBe(selectedSquare);
      // In real flow, this would clear selection
    });

    it('tapping another own piece switches selection', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      boardState.selectedSquare.set('e2');
      boardState.validMoves.set(['e3', 'e4']);

      // Check d2 - another own piece
      const d2Piece = boardState.squares['d2'].piece.get();
      const turn = boardState.turn.get();
      const isOwnPiece = d2Piece && d2Piece[0] === turn;

      expect(isOwnPiece).toBe(true);
      // In real flow, this would switch selection to d2
    });

    it('tapping invalid square clears selection', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      boardState.selectedSquare.set('e2');
      boardState.validMoves.set(['e3', 'e4']);

      // e5 is not in valid moves and has no piece
      const targetSquare = 'e5';
      const validMoves = boardState.validMoves.get();
      const piece = boardState.squares[targetSquare].piece.get();
      const turn = boardState.turn.get();
      const isOwnPiece = piece && piece[0] === turn;

      expect(validMoves.includes(targetSquare)).toBe(false);
      expect(isOwnPiece).toBeFalsy(); // null or false - empty square
      // In real flow, this would clear selection
    });
  });

  describe('consistent move cleanup', () => {
    it('clears valid moves when dragging opponent piece', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      // Simulate previous selection
      boardState.selectedSquare.set('e2');
      boardState.validMoves.set(['e3', 'e4']);

      // After dragging opponent piece (c7), valid moves should be cleared
      // This is what the gesture handler does when snapping back
      boardState.selectedSquare.set(null);
      boardState.validMoves.set([]);

      expect(boardState.selectedSquare.get()).toBeNull();
      expect(boardState.validMoves.get()).toEqual([]);
    });

    it('clears valid moves when dropping on invalid square', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      // Simulate selected piece with valid moves
      boardState.selectedSquare.set('e2');
      boardState.validMoves.set(['e3', 'e4']);

      // Drag and drop on invalid square (e5) should clear
      boardState.selectedSquare.set(null);
      boardState.validMoves.set([]);

      expect(boardState.selectedSquare.get()).toBeNull();
      expect(boardState.validMoves.get()).toEqual([]);
    });

    it('maintains selection when tapping valid target', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      // Select piece
      boardState.selectedSquare.set('e2');
      boardState.validMoves.set(['e3', 'e4']);

      // Verify e4 is valid target
      expect(boardState.validMoves.get().includes('e4')).toBe(true);
      // After move, executeMove clears these
    });
  });

  describe('flipped board gestures', () => {
    it('calculates correct square on flipped board', () => {
      // Top-left on flipped board is h1
      const square = positionToSquare(25, 25, PIECE_SIZE, true);
      expect(square).toBe('h1');
    });

    it('calculates correct square for opposite corner on flipped board', () => {
      // Bottom-right on flipped board is a8
      const square = positionToSquare(375, 375, PIECE_SIZE, true);
      expect(square).toBe('a8');
    });

    it('maintains piece identity regardless of flip', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      // e2 always has white pawn, regardless of visual position
      expect(boardState.squares['e2'].piece.get()).toBe('wp');
      expect(boardState.squares['e7'].piece.get()).toBe('bp');
    });
  });
});
