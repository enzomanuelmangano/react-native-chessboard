import React, { useMemo } from 'react';
import { Circle, Group } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { Square } from 'chess.js';
import { SQUARES } from '../../state/types';
import { useBoardStateValues, useBoardConfig } from '../../state';
import { squareToPosition } from '../../state/use-board-state';

interface ValidMoveDotProps {
  square: Square;
}

const ValidMoveDot: React.FC<ValidMoveDotProps> = React.memo(({ square }) => {
  const { pieceSize } = useBoardConfig();
  const boardState = useBoardStateValues();

  const position = squareToPosition(square, pieceSize);
  const centerX = position.x + pieceSize / 2;
  const centerY = position.y + pieceSize / 2;
  const radius = pieceSize * 0.15;

  const opacity = useDerivedValue(() => {
    const moves = boardState.validMoves.value;
    return moves.includes(square) ? 0.5 : 0;
  }, [boardState.validMoves]);

  return (
    <Circle
      cx={centerX}
      cy={centerY}
      r={radius}
      color="rgba(0, 0, 0, 0.3)"
      opacity={opacity}
    />
  );
});

ValidMoveDot.displayName = 'ValidMoveDot';

export const SkiaDots: React.FC = React.memo(() => {
  const dots = useMemo(() => {
    return SQUARES.map((square) => (
      <ValidMoveDot key={square} square={square} />
    ));
  }, []);

  return <Group>{dots}</Group>;
});

SkiaDots.displayName = 'SkiaDots';
