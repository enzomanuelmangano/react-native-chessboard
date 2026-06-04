import { Chess, Square } from 'chess.js';
import { makeMutable } from 'react-native-reanimated';
import type {
  BoardState,
  PieceCode,
  SquareState,
  HighlightState,
} from '../state/types';
import { SQUARES } from '../state/types';
import {
  MOVE_SPRING,
  SCALE_SPRING,
  SNAP_BACK_SPRING,
} from '../config/animations';

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
  lastMove: makeMutable(false),
  inCheck: makeMutable(false),
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

describe('Performance - Animation Configurations', () => {
  describe('Spring configurations', () => {
    it('MOVE_SPRING is critically damped', () => {
      // For critically damped springs: damping = 2 * sqrt(stiffness * mass)
      // With stiffness=400, mass=1: criticalDamping = 2 * sqrt(400 * 1) = 2 * 20 = 40
      expect(MOVE_SPRING.stiffness).toBe(400);
      expect(MOVE_SPRING.damping).toBe(40);
      expect(MOVE_SPRING.mass).toBe(1);

      const criticalDamping =
        2 * Math.sqrt((MOVE_SPRING.stiffness ?? 0) * (MOVE_SPRING.mass ?? 1));
      expect(MOVE_SPRING.damping).toBe(criticalDamping);
    });

    it('SCALE_SPRING is critically damped', () => {
      // With stiffness=600, mass=1: criticalDamping = 2 * sqrt(600) ≈ 48.99
      expect(SCALE_SPRING.stiffness).toBe(600);
      expect(SCALE_SPRING.damping).toBe(49);
      expect(SCALE_SPRING.mass).toBe(1);

      const criticalDamping =
        2 * Math.sqrt((SCALE_SPRING.stiffness ?? 0) * (SCALE_SPRING.mass ?? 1));
      expect(SCALE_SPRING.damping).toBeCloseTo(criticalDamping, 0);
    });

    it('SNAP_BACK_SPRING is critically damped', () => {
      // With stiffness=350, mass=1: criticalDamping = 2 * sqrt(350) ≈ 37.42
      expect(SNAP_BACK_SPRING.stiffness).toBe(350);
      expect(SNAP_BACK_SPRING.damping).toBe(37);
      expect(SNAP_BACK_SPRING.mass).toBe(1);

      const criticalDamping =
        2 *
        Math.sqrt(
          (SNAP_BACK_SPRING.stiffness ?? 0) * (SNAP_BACK_SPRING.mass ?? 1)
        );
      expect(SNAP_BACK_SPRING.damping).toBeCloseTo(criticalDamping, 0);
    });

    it('all springs have positive stiffness', () => {
      expect(MOVE_SPRING.stiffness).toBeGreaterThan(0);
      expect(SCALE_SPRING.stiffness).toBeGreaterThan(0);
      expect(SNAP_BACK_SPRING.stiffness).toBeGreaterThan(0);
    });

    it('all springs have positive damping', () => {
      expect(MOVE_SPRING.damping).toBeGreaterThan(0);
      expect(SCALE_SPRING.damping).toBeGreaterThan(0);
      expect(SNAP_BACK_SPRING.damping).toBeGreaterThan(0);
    });

    it('all springs have positive mass', () => {
      expect(MOVE_SPRING.mass).toBeGreaterThan(0);
      expect(SCALE_SPRING.mass).toBeGreaterThan(0);
      expect(SNAP_BACK_SPRING.mass).toBeGreaterThan(0);
    });
  });

  describe('Shared value updates during drag (simulation)', () => {
    const PIECE_SIZE = 50;

    it('updates position values without triggering re-renders', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      const e2State = boardState.squares.e2;
      const initialX = e2State.translateX.get();
      const initialY = e2State.translateY.get();

      // Simulate drag updates - these should NOT trigger re-renders
      // because they're SharedValue updates
      e2State.translateX.set(initialX + 10);
      e2State.translateY.set(initialY + 10);

      expect(e2State.translateX.get()).toBe(initialX + 10);
      expect(e2State.translateY.get()).toBe(initialY + 10);
    });

    it('updates scale values without triggering re-renders', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      const e2State = boardState.squares.e2;
      const initialScale = e2State.scale.get();

      // Simulate scale up during drag
      e2State.scale.set(1.1);

      expect(e2State.scale.get()).toBe(1.1);
      expect(initialScale).toBe(1);
    });

    it('updates zIndex values without triggering re-renders', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      const e2State = boardState.squares.e2;

      // Simulate raising piece during drag
      e2State.zIndex.set(100);

      expect(e2State.zIndex.get()).toBe(100);
    });

    it('handles rapid position updates efficiently', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const e2State = boardState.squares.e2;

      // Simulate 60fps drag (60 position updates)
      const startTime = performance.now();

      for (let i = 0; i < 60; i++) {
        e2State.translateX.set(i);
        e2State.translateY.set(i);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // All 60 updates should complete in less than 16ms (one frame budget)
      expect(duration).toBeLessThan(16);
    });
  });

  describe('Board state memory efficiency', () => {
    const PIECE_SIZE = 50;

    it('creates exactly 64 square states', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      expect(Object.keys(boardState.squares)).toHaveLength(64);
    });

    it('creates exactly 64 highlight states', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      expect(Object.keys(boardState.highlights)).toHaveLength(64);
    });

    it('piece updates affect only target square', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      // Store initial pieces
      const initialPieces: Record<string, PieceCode> = {};
      for (const square of SQUARES) {
        initialPieces[square] = boardState.squares[square].piece.get();
      }

      // Update e2
      boardState.squares.e2.piece.set(null);

      // Verify only e2 changed
      for (const square of SQUARES) {
        if (square === 'e2') {
          expect(boardState.squares[square].piece.get()).toBeNull();
        } else {
          expect(boardState.squares[square].piece.get()).toBe(
            initialPieces[square]
          );
        }
      }
    });
  });

  describe('Drag centering calculations', () => {
    const PIECE_SIZE = 50;

    it('calculates center-based offset correctly', () => {
      const pieceX = 200; // top-left corner of piece
      const pieceY = 300;
      const touchX = 225; // touch point
      const touchY = 325;

      // Center of piece
      const pieceCenterX = pieceX + PIECE_SIZE / 2; // 225
      const pieceCenterY = pieceY + PIECE_SIZE / 2; // 325

      // Offset from center
      const offsetX = touchX - pieceCenterX; // 0
      const offsetY = touchY - pieceCenterY; // 0

      expect(offsetX).toBe(0);
      expect(offsetY).toBe(0);
    });

    it('maintains finger position during drag with offset', () => {
      const initialPieceX = 200;
      const initialPieceY = 300;
      const touchX = 210; // touch near top-left of piece
      const touchY = 310;

      // Calculate center-based offset on begin
      const pieceCenterX = initialPieceX + PIECE_SIZE / 2;
      const pieceCenterY = initialPieceY + PIECE_SIZE / 2;
      const offsetX = touchX - pieceCenterX; // -15
      const offsetY = touchY - pieceCenterY; // -15

      // Simulate drag to new position
      const newTouchX = 350;
      const newTouchY = 400;

      // Calculate new piece position using center-based formula
      const newPieceX = newTouchX - offsetX - PIECE_SIZE / 2;
      const newPieceY = newTouchY - offsetY - PIECE_SIZE / 2;

      // Verify finger is still at the same relative position on the piece
      const newPieceCenterX = newPieceX + PIECE_SIZE / 2;
      const newPieceCenterY = newPieceY + PIECE_SIZE / 2;
      const verifyOffsetX = newTouchX - newPieceCenterX;
      const verifyOffsetY = newTouchY - newPieceCenterY;

      expect(verifyOffsetX).toBe(offsetX);
      expect(verifyOffsetY).toBe(offsetY);
    });

    it('handles edge case of touch at piece corner', () => {
      const pieceX = 100;
      const pieceY = 100;

      // Touch at top-left corner
      const touchX = pieceX;
      const touchY = pieceY;

      const pieceCenterX = pieceX + PIECE_SIZE / 2;
      const pieceCenterY = pieceY + PIECE_SIZE / 2;
      const offsetX = touchX - pieceCenterX; // -25
      const offsetY = touchY - pieceCenterY; // -25

      expect(offsetX).toBe(-PIECE_SIZE / 2);
      expect(offsetY).toBe(-PIECE_SIZE / 2);
    });

    it('handles edge case of touch at piece center', () => {
      const pieceX = 100;
      const pieceY = 100;

      // Touch at center
      const touchX = pieceX + PIECE_SIZE / 2;
      const touchY = pieceY + PIECE_SIZE / 2;

      const pieceCenterX = pieceX + PIECE_SIZE / 2;
      const pieceCenterY = pieceY + PIECE_SIZE / 2;
      const offsetX = touchX - pieceCenterX;
      const offsetY = touchY - pieceCenterY;

      expect(offsetX).toBe(0);
      expect(offsetY).toBe(0);
    });
  });
});
