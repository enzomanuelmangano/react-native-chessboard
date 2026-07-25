import React from 'react';
import { act, create } from 'react-test-renderer';
import { Chess, Square } from 'chess.js';
import { makeMutable } from 'react-native-reanimated';
// Types come from the mock directly: `moduleNameMapper` only rewrites the
// runtime resolution, so `react-native-gesture-handler` still types to the
// real package.
import type { MockPanGesture } from '../__mocks__/react-native-gesture-handler';
import { useBoardGesture } from '../hooks/use-board-gesture';
import { squareToPosition } from '../state/use-board-state';
import type { MoveExecutor } from '../state/move-executor';
import type {
  BoardState,
  BoardConfig,
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

// react-test-renderer refuses to treat `act` as concurrent-safe without this.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const PIECE_SIZE = 50;

const createMockBoardState = (chess: Chess): BoardState => {
  const squares: Partial<Record<Square, SquareState>> = {};
  const highlights: Partial<Record<Square, HighlightState>> = {};

  for (const square of SQUARES) {
    const { x, y } = squareToPosition(square, PIECE_SIZE, false);
    const piece = chess.get(square);
    squares[square] = {
      piece: makeMutable<PieceCode>(
        piece ? (`${piece.color}${piece.type}` as PieceCode) : null
      ),
      translateX: makeMutable(x),
      translateY: makeMutable(y),
      scale: makeMutable(1),
      zIndex: makeMutable(0),
      lastMove: makeMutable(false),
      inCheck: makeMutable(false),
    };
    highlights[square] = { color: makeMutable<string | null>(null) };
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
    white: '#f0d9b5',
    black: '#b58863',
    lastMoveHighlight: 'rgba(255, 255, 0, 0.4)',
    checkmateHighlight: 'rgba(255, 0, 0, 0.4)',
    promotionPieceButton: 'rgba(255, 255, 255, 0.8)',
  },
  animations: {
    move: MOVE_SPRING,
    scale: SCALE_SPRING,
    snapBack: SNAP_BACK_SPRING,
  },
  fontSource: null,
};

const event = (x: number, y: number) => ({
  x,
  y,
  translationX: 0,
  translationY: 0,
});

/** Mounts the hook and hands back the pan gesture the board actually uses. */
const mountGesture = (boardState: BoardState) => {
  const moveExecutor = {
    tryMove: jest.fn(),
    selectPiece: jest.fn(),
  } as unknown as MoveExecutor;

  let pan: MockPanGesture | undefined;

  const Probe = () => {
    const gesture = useBoardGesture({
      boardState,
      config,
      moveExecutor,
      gestureEnabled: true,
    }) as unknown as { gestures: [unknown, MockPanGesture] };
    pan = gesture.gestures[1];
    return null;
  };

  act(() => {
    create(<Probe />);
  });

  if (!pan) throw new Error('pan gesture was not captured');
  return { pan, moveExecutor };
};

describe('drag lifecycle', () => {
  // e2 in an unflipped board: file e -> column 4, rank 2 -> row 6.
  const E2 = 'e2' as Square;
  const e2Origin = squareToPosition(E2, PIECE_SIZE, false);
  const e2Center = {
    x: e2Origin.x + PIECE_SIZE / 2,
    y: e2Origin.y + PIECE_SIZE / 2,
  };

  it('still handles the drop when an animation zeroes zIndex mid-drag', () => {
    const chess = new Chess();
    const boardState = createMockBoardState(chess);
    const { pan } = mountGesture(boardState);
    const square = boardState.squares[E2];

    pan.simulateBegin(event(e2Center.x, e2Center.y));
    pan.simulateStart(event(e2Center.x, e2Center.y));
    expect(square.zIndex.get()).toBe(100);

    // Drag the pawn a long way up the board.
    pan.simulateUpdate(event(e2Center.x, e2Center.y - PIECE_SIZE * 3));
    expect(square.translateY.get()).not.toBe(e2Origin.y);

    // A rollback spring belonging to an older animation gets cancelled and
    // drops this square's zIndex back to 0 while the finger is still down.
    square.zIndex.set(0);

    pan.simulateEnd(event(e2Center.x, e2Center.y - PIECE_SIZE * 3));

    // The drop must still be processed: no valid moves were published, so the
    // piece snaps home rather than being stranded where the finger left it.
    expect(square.translateX.get()).toBe(e2Origin.x);
    expect(square.translateY.get()).toBe(e2Origin.y);
    expect(square.scale.get()).toBe(1);
  });

  it('ignores a drop when the pan never became a drag', () => {
    const chess = new Chess();
    const boardState = createMockBoardState(chess);
    const { pan } = mountGesture(boardState);
    const square = boardState.squares[E2];

    // A move animation from an earlier turn still owns this square.
    square.zIndex.set(100);
    square.translateY.set(e2Origin.y - PIECE_SIZE);

    // Finger touches down but never crosses minDistance, so onStart never
    // fires and this is a tap, not a drag.
    pan.simulateBegin(event(e2Center.x, e2Center.y));
    pan.simulateEnd(event(e2Center.x, e2Center.y));

    // The in-flight animation is left alone.
    expect(square.zIndex.get()).toBe(100);
    expect(square.translateY.get()).toBe(e2Origin.y - PIECE_SIZE);
  });

  it('clears the drag flag so the next touch starts clean', () => {
    const chess = new Chess();
    const boardState = createMockBoardState(chess);
    const { pan } = mountGesture(boardState);
    const square = boardState.squares[E2];

    pan.simulateBegin(event(e2Center.x, e2Center.y));
    pan.simulateStart(event(e2Center.x, e2Center.y));
    pan.simulateUpdate(event(e2Center.x, e2Center.y - PIECE_SIZE * 3));
    pan.simulateEnd(event(e2Center.x, e2Center.y - PIECE_SIZE * 3));
    pan.simulateFinalize(event(e2Center.x, e2Center.y - PIECE_SIZE * 3));

    // Second touch is a tap; the previous drag must not leak into it.
    square.zIndex.set(100);
    pan.simulateBegin(event(e2Center.x, e2Center.y));
    pan.simulateEnd(event(e2Center.x, e2Center.y));

    expect(square.zIndex.get()).toBe(100);
  });
});
