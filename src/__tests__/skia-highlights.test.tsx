import React from 'react';
import { Chess, Square } from 'chess.js';
import { makeMutable } from 'react-native-reanimated';
import { SkiaHighlights } from '../components/skia/skia-highlights';
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

const PIECE_SIZE = 50;

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
    selectedHighlight: 'rgba(20,120,20,0.35)',
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

type RectProps = {
  x: number;
  y: number;
  color: string;
  opacity: { get(): number };
};

/** Every highlight rect for `square`, in paint order. */
const rectsAt = (
  boardState: BoardState,
  square: Square,
  config: BoardConfig = makeConfig()
): RectProps[] => {
  const { x, y } = squareToPosition(square, PIECE_SIZE, config.flipped);
  return findAllByType(
    renderToTree(<SkiaHighlights config={config} boardState={boardState} />),
    'skia-rect'
  )
    .map((node) => node.props as unknown as RectProps)
    .filter((props) => props.x === x && props.y === y);
};

describe('SkiaHighlights selection', () => {
  it('is transparent on every square when nothing is selected', () => {
    const boardState = makeBoardState();
    const rects = rectsAt(boardState, 'e2' as Square);

    expect(rects.length).toBeGreaterThan(0);
    for (const rect of rects) {
      expect(rect.opacity.get()).toBe(0);
    }
  });

  it('lights up the selected square with the selection color', () => {
    const boardState = makeBoardState();
    boardState.selectedSquare.set('e2' as Square);

    const config = makeConfig();
    const rects = rectsAt(boardState, 'e2' as Square, config);
    const selectionRect = rects.find(
      (r) => r.color === config.colors.selectedHighlight
    );

    expect(selectionRect).toBeDefined();
    expect(selectionRect?.opacity.get()).toBe(1);
  });

  it('does not light up a square other than the selected one', () => {
    const boardState = makeBoardState();
    boardState.selectedSquare.set('e2' as Square);

    const config = makeConfig();
    const rects = rectsAt(boardState, 'd4' as Square, config);
    const selectionRect = rects.find(
      (r) => r.color === config.colors.selectedHighlight
    );

    expect(selectionRect?.opacity.get()).toBe(0);
  });

  it('clears the selection highlight once deselected', () => {
    const boardState = makeBoardState();
    boardState.selectedSquare.set('e2' as Square);
    boardState.selectedSquare.set(null);

    const config = makeConfig();
    const rects = rectsAt(boardState, 'e2' as Square, config);
    const selectionRect = rects.find(
      (r) => r.color === config.colors.selectedHighlight
    );

    expect(selectionRect?.opacity.get()).toBe(0);
  });
});
