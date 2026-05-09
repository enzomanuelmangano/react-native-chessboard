import { Chess, Square } from 'chess.js';
import { makeMutable } from 'react-native-reanimated';
import {
  createMoveExecutor,
  type EffectSharedValues,
} from '../state/move-executor';
import type {
  BoardState,
  PieceCode,
  SquareState,
  HighlightState,
  BoardConfig,
} from '../state/types';
import { SQUARES } from '../state/types';
import { squareToPosition } from '../state/use-board-state';
import {
  MOVE_SPRING,
  SCALE_SPRING,
  SNAP_BACK_SPRING,
} from '../config/animations';
import type { EffectTrigger } from '../types';

const PIECE_SIZE = 50;

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

const createMockHighlightState = (): HighlightState => ({
  color: makeMutable<string | null>(null),
});

const createMockBoardState = (chess: Chess): BoardState => {
  const squares: Partial<Record<Square, SquareState>> = {};
  const highlights: Partial<Record<Square, HighlightState>> = {};
  for (const square of SQUARES) {
    const pos = squareToPosition(square, PIECE_SIZE, false);
    const piece = chess.get(square);
    const code: PieceCode = piece
      ? (`${piece.color}${piece.type}` as PieceCode)
      : null;
    squares[square] = createMockSquareState(code, pos.x, pos.y);
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

const config: BoardConfig = {
  boardSize: PIECE_SIZE * 8,
  pieceSize: PIECE_SIZE,
  gestureEnabled: true,
  flipped: false,
  withLetters: false,
  withNumbers: false,
  colors: {
    white: '#fff',
    black: '#000',
    lastMoveHighlight: 'rgba(255,255,0,0.5)',
    checkmateHighlight: '#E84855',
    promotionPieceButton: '#FF9B71',
  },
  durations: { move: 150 },
  animations: {
    move: MOVE_SPRING,
    scale: SCALE_SPRING,
    snapBack: SNAP_BACK_SPRING,
  },
  fontSource: null,
};

const createEffectSharedValues = (): EffectSharedValues => ({
  centerX: makeMutable(0),
  centerY: makeMutable(0),
  progress: makeMutable(0),
  trigger: makeMutable<EffectTrigger>(''),
});

describe('renderEffect reset on resetBoard', () => {
  it('resets effect SharedValues to defaults when resetBoard runs without a fen', () => {
    const chess = new Chess();
    const boardState = createMockBoardState(chess);
    const effectSharedValues = createEffectSharedValues();

    // Simulate a check/checkmate having previously written effect state.
    effectSharedValues.centerX.set(123);
    effectSharedValues.centerY.set(456);
    effectSharedValues.progress.set(0.8);
    effectSharedValues.trigger.set('checkmate');

    const executor = createMoveExecutor(chess, boardState, config, {
      effectSharedValues,
    });

    executor.resetBoard();

    expect(effectSharedValues.centerX.get()).toBe(0);
    expect(effectSharedValues.centerY.get()).toBe(0);
    expect(effectSharedValues.progress.get()).toBe(0);
    expect(effectSharedValues.trigger.get()).toBe('');
  });

  it('also resets effect SharedValues when resetBoard loads a custom fen', () => {
    const chess = new Chess();
    const boardState = createMockBoardState(chess);
    const effectSharedValues = createEffectSharedValues();

    effectSharedValues.centerX.set(200);
    effectSharedValues.trigger.set('check');

    const executor = createMoveExecutor(chess, boardState, config, {
      effectSharedValues,
    });

    // Kiwipete
    executor.resetBoard(
      'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'
    );

    expect(effectSharedValues.centerX.get()).toBe(0);
    expect(effectSharedValues.trigger.get()).toBe('');
  });

  it('does not throw when called without effectSharedValues', () => {
    const chess = new Chess();
    const boardState = createMockBoardState(chess);
    const executor = createMoveExecutor(chess, boardState, config, {});

    expect(() => executor.resetBoard()).not.toThrow();
  });

  it('also resets effect SharedValues when invoked through undo()', () => {
    const chess = new Chess();
    const boardState = createMockBoardState(chess);
    const effectSharedValues = createEffectSharedValues();

    const executor = createMoveExecutor(chess, boardState, config, {
      effectSharedValues,
    });

    // Make a move so undo has something to undo, then dirty the effect SVs.
    executor.executeMove('e2' as Square, 'e4' as Square);
    effectSharedValues.centerX.set(50);
    effectSharedValues.centerY.set(50);
    effectSharedValues.progress.set(0.5);
    effectSharedValues.trigger.set('check');

    executor.undo();

    expect(effectSharedValues.centerX.get()).toBe(0);
    expect(effectSharedValues.centerY.get()).toBe(0);
    expect(effectSharedValues.progress.get()).toBe(0);
    expect(effectSharedValues.trigger.get()).toBe('');
  });
});
