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
import { collectLegalTargets } from '../helpers/collect-legal-targets';
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
    legalTargets: makeMutable(collectLegalTargets(chess)),
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
    selectedHighlight: 'rgba(20,120,20,0.35)',
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

  describe('drop validation', () => {
    // `selectPiece` runs on the JS thread, one scheduleOnRN hop after
    // `onStart` asks for it. A fast drag reaches `onEnd` before that lands,
    // so `validMoves` still holds the PREVIOUS selection — or nothing. The
    // drop must be judged against the position instead. These tests model
    // that by never letting `validMoves` catch up.
    const E4 = 'e4' as Square;
    const e4Origin = squareToPosition(E4, PIECE_SIZE, false);
    const e4Center = {
      x: e4Origin.x + PIECE_SIZE / 2,
      y: e4Origin.y + PIECE_SIZE / 2,
    };

    const dragTo = (
      pan: MockPanGesture,
      from: { x: number; y: number },
      to: { x: number; y: number }
    ) => {
      pan.simulateBegin(event(from.x, from.y));
      pan.simulateStart(event(from.x, from.y));
      pan.simulateUpdate(event(to.x, to.y));
      pan.simulateEnd(event(to.x, to.y));
    };

    it('accepts a legal drop even though validMoves is still empty', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess);
      const { pan, moveExecutor } = mountGesture(boardState);

      // Nothing selected yet — exactly the state a first drag starts from.
      expect(boardState.validMoves.get()).toEqual([]);

      dragTo(pan, e2Center, e4Center);

      expect(moveExecutor.tryMove).toHaveBeenCalledWith(E2, E4);
    });

    it('accepts a legal drop while another piece is still selected', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess);
      const { pan, moveExecutor } = mountGesture(boardState);

      // b1 was tapped a moment ago; its targets are what validMoves holds.
      boardState.selectedSquare.set('b1' as Square);
      boardState.validMoves.set(['a3' as Square, 'c3' as Square]);

      dragTo(pan, e2Center, e4Center);

      // e4 is not in b1's targets, but it IS legal for the e2 pawn.
      expect(moveExecutor.tryMove).toHaveBeenCalledWith(E2, E4);
    });

    it('rejects an illegal drop even when a stale selection allows it', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess);
      const { pan, moveExecutor } = mountGesture(boardState);
      const square = boardState.squares[E2];

      // The stale list contains the drop square, but the e2 pawn cannot
      // reach e5. Trusting it animated the piece onto a square chess.js
      // never moved it to, desyncing the board.
      boardState.selectedSquare.set('e7' as Square);
      boardState.validMoves.set(['e5' as Square, 'e6' as Square]);

      const e5Center = {
        x: e4Center.x,
        y:
          squareToPosition('e5' as Square, PIECE_SIZE, false).y +
          PIECE_SIZE / 2,
      };
      dragTo(pan, e2Center, e5Center);

      expect(moveExecutor.tryMove).not.toHaveBeenCalled();
      // Snapped home rather than left on the illegal square.
      expect(square.translateX.get()).toBe(e2Origin.x);
      expect(square.translateY.get()).toBe(e2Origin.y);
    });
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
