import React, { useMemo } from 'react';
import { Group, Rect } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { Square } from 'chess.js';
import { SQUARES } from '../../state/types';
import { useBoardStateValues, useBoardConfig } from '../../state';
import { squareToPosition } from '../../state/use-board-state';

interface SquareHighlightProps {
  square: Square;
}

const SquareHighlight: React.FC<SquareHighlightProps> = React.memo(
  ({ square }) => {
    const { pieceSize, colors } = useBoardConfig();
    const boardState = useBoardStateValues();
    const highlightState = boardState.highlights[square];

    const position = squareToPosition(square, pieceSize);

    const color = useDerivedValue(() => {
      // Check for custom highlight
      if (highlightState.color.value) {
        return highlightState.color.value;
      }

      // Check for last move highlight
      const lastMoveVal = boardState.lastMove.value;
      if (lastMoveVal) {
        if (lastMoveVal.from === square || lastMoveVal.to === square) {
          return colors.lastMoveHighlight;
        }
      }

      // Check for check highlight
      if (boardState.kingInCheckSquare.value === square) {
        return colors.checkmateHighlight;
      }

      return 'transparent';
    }, [
      highlightState.color,
      boardState.lastMove,
      boardState.kingInCheckSquare,
    ]);

    const opacity = useDerivedValue(() => {
      return color.value === 'transparent' ? 0 : 1;
    }, [color]);

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

export const SkiaHighlights: React.FC = React.memo(() => {
  const highlights = useMemo(() => {
    return SQUARES.map((square) => (
      <SquareHighlight key={square} square={square} />
    ));
  }, []);

  return <Group>{highlights}</Group>;
});

SkiaHighlights.displayName = 'SkiaHighlights';
