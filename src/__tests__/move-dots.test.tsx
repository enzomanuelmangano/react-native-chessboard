import React from 'react';
import { Chess, Square } from 'chess.js';
import { makeMutable } from 'react-native-reanimated';
import { Group } from '@shopify/react-native-skia';
import { SkiaDots, dotProgress } from '../components/skia/skia-dots';
import { SkiaBoard } from '../components/skia/skia-board';
import { SkiaPiecesAtlas } from '../components/skia/skia-pieces-atlas';
import { squareToPosition } from '../state/use-board-state';
import type {
  BoardConfig,
  BoardState,
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
import { findAllByType, renderToTree } from './render-utils';
import type { RenderedJSON } from './render-utils';

const PIECE_SIZE = 50;
const DOT_RADIUS = PIECE_SIZE * 0.16;
const CAPTURE_INNER = PIECE_SIZE * 0.58;
const POOL_SIZE = 27;
// Mirrors PathOp.Difference in the skia mock.
const DIFFERENCE = 0;

const makeConfig = (overrides: Partial<BoardConfig> = {}): BoardConfig => ({
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
  animations: {
    move: MOVE_SPRING,
    scale: SCALE_SPRING,
    snapBack: SNAP_BACK_SPRING,
  },
  fontSource: null,
  ...overrides,
});

const makeBoardState = (fen?: string): BoardState => {
  const chess = new Chess(fen);
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

const select = (
  boardState: BoardState,
  from: Square | null,
  targets: Square[]
) => {
  boardState.selectedSquare.set(from);
  boardState.validMoves.set(targets);
};

type MockCircle = { x: number; y: number; radius: number };
type MockPath = {
  circles?: MockCircle[];
  rects?: unknown[];
  op?: number;
  one?: { circles?: MockCircle[]; rects?: unknown[] };
  two?: { circles?: MockCircle[] };
};

/** Every path the dots layer handed to Skia, in render order. */
const renderPaths = (
  boardState: BoardState,
  config: BoardConfig = makeConfig()
): MockPath[] =>
  findAllByType(
    // Wrapped so the fragment of pooled dots has a single root to render into.
    renderToTree(
      <Group>
        <SkiaDots config={config} boardState={boardState} />
      </Group>
    ),
    'skia-path'
  ).map((node) => {
    const path = (node.props as { path: { get(): MockPath } }).path;
    return path.get();
  });

const filledCircles = (paths: MockPath[]): MockCircle[] =>
  paths.flatMap((p) => p.circles ?? []);

const captureMarks = (paths: MockPath[]): MockPath[] =>
  paths.filter((p) => p.op === DIFFERENCE);

const centreOf = (square: Square, flipped = false) => {
  const pos = squareToPosition(square, PIECE_SIZE, flipped);
  return { x: pos.x + PIECE_SIZE / 2, y: pos.y + PIECE_SIZE / 2 };
};

describe('dotProgress', () => {
  const ORIGIN = { x: 0, y: 0 };

  it('is fully revealed for the origin square itself', () => {
    expect(
      dotProgress(1, ORIGIN.x, ORIGIN.y, ORIGIN.x, ORIGIN.y, PIECE_SIZE)
    ).toBe(1);
  });

  it('starts nearer targets before farther ones', () => {
    const near = dotProgress(0.3, PIECE_SIZE, 0, 0, 0, PIECE_SIZE);
    const far = dotProgress(0.3, PIECE_SIZE * 4, 0, 0, 0, PIECE_SIZE);

    expect(near).toBeGreaterThan(far);
  });

  it('uses Chebyshev distance, so a diagonal neighbour matches an orthogonal one', () => {
    const orthogonal = dotProgress(0.4, PIECE_SIZE, 0, 0, 0, PIECE_SIZE);
    const diagonal = dotProgress(0.4, PIECE_SIZE, PIECE_SIZE, 0, 0, PIECE_SIZE);

    expect(diagonal).toBe(orthogonal);
  });

  it('caps the stagger so the farthest target still starts in time', () => {
    // Squares 6 and 7 away would drift apart without the cap.
    const six = dotProgress(0.6, PIECE_SIZE * 6, 0, 0, 0, PIECE_SIZE);
    const seven = dotProgress(0.6, PIECE_SIZE * 7, 0, 0, 0, PIECE_SIZE);

    expect(seven).toBe(six);
  });

  it('clamps to 0 before its turn and 1 at the end', () => {
    expect(dotProgress(0, PIECE_SIZE * 3, 0, 0, 0, PIECE_SIZE)).toBe(0);
    expect(dotProgress(1, PIECE_SIZE * 3, 0, 0, 0, PIECE_SIZE)).toBe(1);
  });

  it('applies no stagger when there is no origin', () => {
    expect(dotProgress(0.5, PIECE_SIZE * 5, 0, null, null, PIECE_SIZE)).toBe(
      0.5
    );
  });
});

describe('SkiaDots', () => {
  it('draws nothing when no piece is selected', () => {
    const boardState = makeBoardState();
    const paths = renderPaths(boardState);

    expect(filledCircles(paths)).toHaveLength(0);
    expect(captureMarks(paths)).toHaveLength(0);
  });

  it('keeps a fixed pool of slots so selecting never re-renders React', () => {
    const boardState = makeBoardState();
    select(boardState, 'e2' as Square, ['e3' as Square, 'e4' as Square]);

    // One dot path + one capture path per slot, regardless of target count.
    expect(renderPaths(boardState)).toHaveLength(POOL_SIZE * 2);
  });

  it('draws a dot centred on each empty target', () => {
    const boardState = makeBoardState();
    select(boardState, 'e2' as Square, ['e3' as Square, 'e4' as Square]);

    const circles = filledCircles(renderPaths(boardState));

    expect(circles).toHaveLength(2);
    expect(circles).toEqual(
      expect.arrayContaining([
        { ...centreOf('e3' as Square), radius: DOT_RADIUS },
        { ...centreOf('e4' as Square), radius: DOT_RADIUS },
      ])
    );
  });

  it('never draws a dot on an occupied target', () => {
    // White pawn e4, black pawn d5: exd5 is a capture, e5 is empty.
    const boardState = makeBoardState(
      'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
    );
    select(boardState, 'e4' as Square, ['e5' as Square, 'd5' as Square]);

    const paths = renderPaths(boardState);
    const circles = filledCircles(paths);

    // Only the empty square gets a dot...
    expect(circles).toEqual([
      { ...centreOf('e5' as Square), radius: DOT_RADIUS },
    ]);
    // ...and the occupied one is marked without covering the piece.
    expect(captureMarks(paths)).toHaveLength(1);
  });

  it('marks a capture as the square minus a circle, not a filled shape', () => {
    const boardState = makeBoardState(
      'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
    );
    select(boardState, 'e4' as Square, ['d5' as Square]);

    const [mark] = captureMarks(renderPaths(boardState));
    const centre = centreOf('d5' as Square);

    expect(mark.op).toBe(DIFFERENCE);
    // Subtrahend is the circle, so nothing is painted over the piece.
    expect(mark.two?.circles).toEqual([{ ...centre, radius: CAPTURE_INNER }]);
    expect(mark.one?.rects).toHaveLength(1);
  });

  it('keeps the subtracted circle larger than half a square', () => {
    // Guards the bleed bug: with an even-odd fill anything past 0.5 painted
    // into the neighbouring squares. A real Difference has no such limit, and
    // the radius must stay above 0.5 for the corners to stay slivers.
    const boardState = makeBoardState(
      'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
    );
    select(boardState, 'e4' as Square, ['d5' as Square]);

    const [mark] = captureMarks(renderPaths(boardState));

    expect(mark.two?.circles?.[0].radius).toBeGreaterThan(PIECE_SIZE / 2);
  });

  it('mirrors dot positions when the board is flipped', () => {
    const boardState = makeBoardState();
    select(boardState, 'e2' as Square, ['e4' as Square]);

    const circles = filledCircles(
      renderPaths(boardState, makeConfig({ flipped: true }))
    );

    expect(circles).toEqual([
      { ...centreOf('e4' as Square, true), radius: DOT_RADIUS },
    ]);
  });

  it('draws every target of a wide-open queen', () => {
    const boardState = makeBoardState('4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1');
    const chess = new Chess('4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1');
    const targets = chess
      .moves({ square: 'd4' as Square, verbose: true })
      .map((m) => m.to as Square);
    select(boardState, 'd4' as Square, targets);

    // 27 is the pool size and also the queen's maximum — the pool must not
    // silently drop the last target.
    expect(targets.length).toBeLessThanOrEqual(POOL_SIZE);
    expect(filledCircles(renderPaths(boardState))).toHaveLength(targets.length);
  });
});

describe('piece layering', () => {
  const spriteImage = { __mock: 'SkImage' } as never;

  const atlasSpriteCount = (tree: RenderedJSON, index: number): number => {
    const atlases = findAllByType(tree, 'skia-atlas');
    const sprites = (atlases[index].props as { sprites: { get(): unknown[] } })
      .sprites;
    return sprites.get().length;
  };

  it('puts resting pieces in the resting layer only', () => {
    const boardState = makeBoardState();
    const tree = renderToTree(
      <SkiaPiecesAtlas
        layer="resting"
        spriteImage={spriteImage}
        boardState={boardState}
        pieceSize={PIECE_SIZE}
      />
    );

    expect(atlasSpriteCount(tree, 0)).toBe(32);
  });

  it('moves a lifted piece out of the resting layer and into the raised one', () => {
    const boardState = makeBoardState();
    boardState.squares.e2.zIndex.set(100);

    const resting = renderToTree(
      <SkiaPiecesAtlas
        layer="resting"
        spriteImage={spriteImage}
        boardState={boardState}
        pieceSize={PIECE_SIZE}
      />
    );
    const raised = renderToTree(
      <SkiaPiecesAtlas
        layer="raised"
        spriteImage={spriteImage}
        boardState={boardState}
        pieceSize={PIECE_SIZE}
      />
    );

    expect(atlasSpriteCount(resting, 0)).toBe(31);
    expect(atlasSpriteCount(raised, 0)).toBe(1);
  });

  it('renders dots between the resting and raised layers', () => {
    const boardState = makeBoardState();
    select(boardState, 'e2' as Square, ['e4' as Square]);
    boardState.squares.e2.zIndex.set(100);

    const tree = renderToTree(
      <SkiaBoard
        config={makeConfig()}
        boardState={boardState}
        spriteImage={spriteImage}
      />
    );

    // Walk the drawn nodes in paint order and check the dots land between the
    // two atlases: above resting pieces (so captures show) and below the
    // lifted piece (so the piece under the finger is never occluded).
    const order = findAllByType(tree, 'skia-atlas')
      .map(() => 'atlas')
      .concat();
    expect(order).toHaveLength(2);

    const drawn: string[] = [];
    const walk = (node: RenderedJSON) => {
      if (node.type === 'skia-atlas') drawn.push('atlas');
      if (node.type === 'skia-path') drawn.push('path');
      for (const child of node.children ?? []) {
        if (child && typeof child === 'object') walk(child as RenderedJSON);
      }
    };
    walk(tree);

    const firstAtlas = drawn.indexOf('atlas');
    const lastAtlas = drawn.lastIndexOf('atlas');
    const firstPath = drawn.indexOf('path');

    expect(firstAtlas).toBeLessThan(firstPath);
    expect(firstPath).toBeLessThan(lastAtlas);
  });
});
