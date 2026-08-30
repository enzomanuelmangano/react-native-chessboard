import React, { useMemo } from 'react';
import { Group, Rect } from '@shopify/react-native-skia';
import { Easing, useDerivedValue, withTiming } from 'react-native-reanimated';
import type { Square } from 'chess.js';
import { SQUARES, BoardConfig, BoardState } from '../../state/types';
import { squareToPosition } from '../../state/use-board-state';

const HIGHLIGHT_FADE_MS = 180;
const FADE_OPTIONS = { duration: HIGHLIGHT_FADE_MS, easing: Easing.linear };

interface SquareHighlightProps {
  square: Square;
  config: BoardConfig;
  boardState: BoardState;
}

const SquareHighlight: React.FC<SquareHighlightProps> = React.memo(
  ({ square, config, boardState }) => {
    const { pieceSize, colors, flipped } = config;
    const highlightState = boardState.highlights[square];
    const squareState = boardState.squares[square];

    const position = squareToPosition(square, pieceSize, flipped);

    // Each highlight type renders as its own layer with an independent
    // opacity that animates linearly. When two states cross over (e.g.
    // last-move yellow → check red) one fades out while the other fades
    // in, producing a smooth colour transition instead of a hard flip.
    const lastMoveOpacity = useDerivedValue(() =>
      withTiming(squareState.lastMove.get() ? 1 : 0, FADE_OPTIONS)
    );

    const checkOpacity = useDerivedValue(() =>
      withTiming(squareState.inCheck.get() ? 1 : 0, FADE_OPTIONS)
    );

    const selectedOpacity = useDerivedValue(() =>
      withTiming(
        boardState.selectedSquare.get() === square ? 1 : 0,
        FADE_OPTIONS
      )
    );

    const customColor = useDerivedValue(
      () => highlightState.color.get() ?? 'transparent'
    );
    const customOpacity = useDerivedValue(() => {
      const active = !!highlightState.color.get();
      return withTiming(active ? 1 : 0, FADE_OPTIONS);
    });

    return (
      <Group>
        <Rect
          x={position.x}
          y={position.y}
          width={pieceSize}
          height={pieceSize}
          color={colors.selectedHighlight}
          opacity={selectedOpacity}
        />
        <Rect
          x={position.x}
          y={position.y}
          width={pieceSize}
          height={pieceSize}
          color={colors.lastMoveHighlight}
          opacity={lastMoveOpacity}
        />
        <Rect
          x={position.x}
          y={position.y}
          width={pieceSize}
          height={pieceSize}
          color={colors.checkmateHighlight}
          opacity={checkOpacity}
        />
        <Rect
          x={position.x}
          y={position.y}
          width={pieceSize}
          height={pieceSize}
          color={customColor}
          opacity={customOpacity}
        />
      </Group>
    );
  }
);

SquareHighlight.displayName = 'SquareHighlight';

interface SkiaHighlightsProps {
  config: BoardConfig;
  boardState: BoardState;
}

export const SkiaHighlights: React.FC<SkiaHighlightsProps> = React.memo(
  ({ config, boardState }) => {
    const highlights = useMemo(() => {
      return SQUARES.map((square) => (
        <SquareHighlight
          key={square}
          square={square}
          config={config}
          boardState={boardState}
        />
      ));
    }, [config, boardState]);

    return <Group>{highlights}</Group>;
  }
);

SkiaHighlights.displayName = 'SkiaHighlights';
