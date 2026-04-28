import React, { useMemo } from 'react';
import { Group, Rect } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { Square } from 'chess.js';
import { SQUARES, BoardConfig, BoardState } from '../../state/types';
import { squareToPosition } from '../../state/use-board-state';

interface SquareHighlightProps {
  square: Square;
  config: BoardConfig;
  boardState: BoardState;
}

const SquareHighlight: React.FC<SquareHighlightProps> = React.memo(
  ({ square, config, boardState }) => {
    const { pieceSize, colors, flipped } = config;
    const highlightState = boardState.highlights[square];

    const position = squareToPosition(square, pieceSize, flipped);

    const color = useDerivedValue(() => {
      // Check for custom highlight
      const customColor = highlightState.color.get();
      if (customColor) {
        return customColor;
      }

      // Check for last move highlight
      const lastMoveVal = boardState.lastMove.get();
      if (lastMoveVal) {
        if (lastMoveVal.from === square || lastMoveVal.to === square) {
          return colors.lastMoveHighlight;
        }
      }

      // Check for check highlight
      if (boardState.kingInCheckSquare.get() === square) {
        return colors.checkmateHighlight;
      }

      return 'transparent';
    });

    const opacity = useDerivedValue(() => {
      return color.get() === 'transparent' ? 0 : 1;
    });

    return (
      <Rect
        x={position.x}
        y={position.y}
        width={pieceSize}
        height={pieceSize}
        color={color}
        opacity={opacity}
      />
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
