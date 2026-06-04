import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Chess } from 'chess.js';
import { makeMutable } from 'react-native-reanimated';
import type { Square } from 'chess.js';

// react-native isn't transformed by this jest setup; stub the two primitives
// the layer uses so it can mount under react-test-renderer.
jest.mock('react-native', () => ({
  View: 'View',
  StyleSheet: {
    create: (s: Record<string, unknown>) => s,
    absoluteFill: {
      position: 'absolute',
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    },
  },
}));

import { AccessibilityLayer } from '../components/accessibility-layer';
import { SQUARES } from '../state/types';
import { squareToPosition } from '../state/use-board-state';
import type { BoardConfig, BoardState, PieceCode } from '../state/types';
import type { MoveExecutor } from '../state/move-executor';

const makeBoardState = (chess: Chess): BoardState => {
  const squares = {} as BoardState['squares'];
  for (const square of SQUARES) {
    const p = chess.get(square);
    squares[square] = {
      piece: makeMutable<PieceCode>(
        p ? (`${p.color}${p.type}` as PieceCode) : null
      ),
    } as unknown as BoardState['squares'][Square];
  }
  return {
    squares,
    turn: makeMutable(chess.turn()),
    selectedSquare: makeMutable<Square | null>(null),
    validMoves: makeMutable<Square[]>([]),
    lastMove: makeMutable<{ from: Square; to: Square } | null>(null),
  } as unknown as BoardState;
};

const config = {
  pieceSize: 50,
  flipped: false,
} as unknown as BoardConfig;

const findByLabel = (root: TestRenderer.ReactTestInstance, label: string) =>
  root.findAll((n) => n.props?.accessibilityLabel === label);

describe('AccessibilityLayer', () => {
  it('labels every square with its contents', () => {
    const chess = new Chess();
    const boardState = makeBoardState(chess);
    const moveExecutor = {
      selectPiece: jest.fn(),
      tryMove: jest.fn(),
    } as unknown as MoveExecutor;

    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AccessibilityLayer
          chess={chess}
          boardState={boardState}
          config={config}
          moveExecutor={moveExecutor}
        />
      );
    });
    const root = renderer.root;

    expect(findByLabel(root, 'e2, white pawn')).toHaveLength(1);
    expect(findByLabel(root, 'e1, white king')).toHaveLength(1);
    expect(findByLabel(root, 'd8, black queen')).toHaveLength(1);
    expect(findByLabel(root, 'e4, empty')).toHaveLength(1);
    expect(findByLabel(root, 'Chessboard, white to move')).toHaveLength(1);
  });

  it('selects an own piece when its square is activated', () => {
    const chess = new Chess();
    const boardState = makeBoardState(chess);
    const selectPiece = jest.fn();
    const moveExecutor = {
      selectPiece,
      tryMove: jest.fn(),
    } as unknown as MoveExecutor;

    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AccessibilityLayer
          chess={chess}
          boardState={boardState}
          config={config}
          moveExecutor={moveExecutor}
        />
      );
    });

    const [e2] = findByLabel(renderer.root, 'e2, white pawn');
    act(() => {
      (e2.props as { onAccessibilityTap: () => void }).onAccessibilityTap();
    });
    expect(selectPiece).toHaveBeenCalledWith('e2');
  });

  it('positions squares using the board geometry', () => {
    const chess = new Chess();
    const boardState = makeBoardState(chess);
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AccessibilityLayer
          chess={chess}
          boardState={boardState}
          config={config}
          moveExecutor={
            {
              selectPiece: jest.fn(),
              tryMove: jest.fn(),
            } as unknown as MoveExecutor
          }
        />
      );
    });
    const [e1] = findByLabel(renderer.root, 'e1, white king');
    const pos = squareToPosition('e1' as Square, 50, false);
    const style = (e1.props as { style: Array<Record<string, number>> }).style;
    const flat = Object.assign({}, ...style);
    expect(flat.left).toBe(pos.x);
    expect(flat.top).toBe(pos.y);
  });
});
