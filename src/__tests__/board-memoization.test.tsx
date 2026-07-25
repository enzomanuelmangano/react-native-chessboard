import React from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { Chess, Square } from 'chess.js';
import { useFont } from '@shopify/react-native-skia';
import { makeMutable } from 'react-native-reanimated';
import { BoardBackground } from '../components/skia/board-background';
import { SkiaBoard } from '../components/skia/skia-board';
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
import { findAllByType } from './render-utils';
import type { RenderedJSON } from './render-utils';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// `BoardBackground` calls `useFont` on every render (it is not memoized
// internally), so the mock's call count is a render counter for it — and, by
// extension, for any parent that would re-render it.
const useFontMock = useFont as jest.Mock;

const PIECE_SIZE = 50;

/** A fresh object each call, mirroring an inline `colors` prop upstream. */
const makeConfig = (overrides: Partial<BoardConfig> = {}): BoardConfig => ({
  boardSize: PIECE_SIZE * 8,
  pieceSize: PIECE_SIZE,
  gestureEnabled: true,
  flipped: false,
  withLetters: true,
  withNumbers: true,
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

const makeBoardState = (): BoardState => {
  const chess = new Chess();
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

/** Renders `element`, then re-renders with `next` and reports render counts. */
const renderThenUpdate = (
  element: React.ReactElement,
  next: React.ReactElement
) => {
  let renderer: ReactTestRenderer | null = null;
  useFontMock.mockClear();

  act(() => {
    renderer = create(element);
  });
  const afterMount = useFontMock.mock.calls.length;

  act(() => {
    renderer!.update(next);
  });

  return { afterMount, afterUpdate: useFontMock.mock.calls.length };
};

describe('BoardBackground memoization', () => {
  it('does not re-render for a new config object with the same values', () => {
    const { afterMount, afterUpdate } = renderThenUpdate(
      <BoardBackground config={makeConfig()} />,
      <BoardBackground config={makeConfig()} />
    );

    expect(afterMount).toBeGreaterThan(0);
    expect(afterUpdate).toBe(afterMount);
  });

  it('re-renders when a drawn colour changes', () => {
    const { afterMount, afterUpdate } = renderThenUpdate(
      <BoardBackground config={makeConfig()} />,
      <BoardBackground
        config={makeConfig({
          colors: { ...makeConfig().colors, white: '#123456' },
        })}
      />
    );

    expect(afterUpdate).toBeGreaterThan(afterMount);
  });

  it('re-renders when pieceSize changes', () => {
    const { afterMount, afterUpdate } = renderThenUpdate(
      <BoardBackground config={makeConfig()} />,
      <BoardBackground config={makeConfig({ pieceSize: 64 })} />
    );

    expect(afterUpdate).toBeGreaterThan(afterMount);
  });

  it('re-renders on flip while coordinates are shown', () => {
    const { afterMount, afterUpdate } = renderThenUpdate(
      <BoardBackground config={makeConfig()} />,
      <BoardBackground config={makeConfig({ flipped: true })} />
    );

    expect(afterUpdate).toBeGreaterThan(afterMount);
  });

  it('ignores a flip when no coordinates are drawn', () => {
    const bare = { withLetters: false, withNumbers: false };
    const { afterMount, afterUpdate } = renderThenUpdate(
      <BoardBackground config={makeConfig(bare)} />,
      <BoardBackground config={makeConfig({ ...bare, flipped: true })} />
    );

    // The checkerboard is symmetric, so flipping it changes nothing to draw.
    expect(afterUpdate).toBe(afterMount);
  });
});

describe('SkiaBoard memoization', () => {
  it('does not re-render its subtree for an equal config object', () => {
    const boardState = makeBoardState();
    const { afterMount, afterUpdate } = renderThenUpdate(
      <SkiaBoard
        config={makeConfig()}
        boardState={boardState}
        spriteImage={null}
      />,
      <SkiaBoard
        config={makeConfig()}
        boardState={boardState}
        spriteImage={null}
      />
    );

    expect(afterMount).toBeGreaterThan(0);
    expect(afterUpdate).toBe(afterMount);
  });

  it('re-renders when a drawn colour changes', () => {
    const boardState = makeBoardState();
    const { afterMount, afterUpdate } = renderThenUpdate(
      <SkiaBoard
        config={makeConfig()}
        boardState={boardState}
        spriteImage={null}
      />,
      <SkiaBoard
        config={makeConfig({
          colors: { ...makeConfig().colors, black: '#654321' },
        })}
        boardState={boardState}
        spriteImage={null}
      />
    );

    expect(afterUpdate).toBeGreaterThan(afterMount);
  });

  it('ignores config fields it never draws', () => {
    const boardState = makeBoardState();
    const { afterMount, afterUpdate } = renderThenUpdate(
      <SkiaBoard
        config={makeConfig()}
        boardState={boardState}
        spriteImage={null}
      />,
      <SkiaBoard
        config={makeConfig({ gestureEnabled: false })}
        boardState={boardState}
        spriteImage={null}
      />
    );

    // `gestureEnabled` reaches the gesture layer, never a Skia node.
    expect(afterUpdate).toBe(afterMount);
  });

  it('re-renders when the sprite sheet arrives', () => {
    const boardState = makeBoardState();
    const config = makeConfig();
    const sprite = { __mock: 'SkImage' } as never;

    // The config is untouched here, so the background legitimately stays
    // bailed out — assert on the atlas the sprite is actually handed to.
    let renderer: ReactTestRenderer | null = null;
    act(() => {
      renderer = create(
        <SkiaBoard config={config} boardState={boardState} spriteImage={null} />
      );
    });

    const atlasImage = () => {
      const tree = (renderer as unknown as ReactTestRenderer).toJSON();
      const atlas = findAllByType(tree as RenderedJSON, 'skia-atlas')[0];
      return (atlas?.props as { image?: unknown } | undefined)?.image;
    };

    // No sheet yet: the atlas renders nothing at all.
    expect(atlasImage()).toBeUndefined();

    act(() => {
      renderer!.update(
        <SkiaBoard
          config={config}
          boardState={boardState}
          spriteImage={sprite}
        />
      );
    });

    expect(atlasImage()).toBe(sprite);
  });
});
