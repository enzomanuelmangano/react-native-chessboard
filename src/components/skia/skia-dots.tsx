import React, { useMemo } from 'react';
import { Circle, Group } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { Square } from 'chess.js';
import { SQUARES, BoardConfig, BoardState } from '../../state/types';
import { squareToPosition } from '../../state/use-board-state';

interface ValidMoveDotProps {
  square: Square;
  config: BoardConfig;
  boardState: BoardState;
}

const ValidMoveDot: React.FC<ValidMoveDotProps> = React.memo(
  ({ square, config, boardState }) => {
    const { pieceSize, flipped } = config;

    const position = squareToPosition(square, pieceSize, flipped);
    const centerX = position.x + pieceSize / 2;
    const centerY = position.y + pieceSize / 2;
    const radius = pieceSize * 0.15;

    const opacity = useDerivedValue(() => {
      const moves = boardState.validMoves.get();
      return moves.includes(square) ? 0.5 : 0;
    });

    return (
      <Circle
        cx={centerX}
        cy={centerY}
        r={radius}
        color="rgba(0, 0, 0, 0.3)"
        opacity={opacity}
      />
    );
  }
);

ValidMoveDot.displayName = 'ValidMoveDot';

interface SkiaDotsProps {
  config: BoardConfig;
  boardState: BoardState;
}

export const SkiaDots: React.FC<SkiaDotsProps> = React.memo(
  ({ config, boardState }) => {
    const dots = useMemo(() => {
      return SQUARES.map((square) => (
        <ValidMoveDot
          key={square}
          square={square}
          config={config}
          boardState={boardState}
        />
      ));
    }, [config, boardState]);

    return <Group>{dots}</Group>;
  }
);

SkiaDots.displayName = 'SkiaDots';
