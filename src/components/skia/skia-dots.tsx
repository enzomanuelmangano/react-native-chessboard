import React from 'react';
import { Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { BoardConfig, BoardState } from '../../state/types';
import { squareToPosition } from '../../state/use-board-state';

interface SkiaDotsProps {
  config: BoardConfig;
  boardState: BoardState;
}

// All valid-move dots are built by ONE derived path that reads the shared
// `validMoves` once (a single subscription) and adds a circle per target —
// instead of 64 per-square components each subscribing to `validMoves` and
// scanning it. It re-runs ONLY when `validMoves` changes (not every frame),
// so it costs nothing at rest. Dots are binary (no per-square opacity), so
// one Path is a perfect fit.
export const SkiaDots: React.FC<SkiaDotsProps> = React.memo(
  ({ config, boardState }) => {
    const { pieceSize, flipped } = config;
    const radius = pieceSize * 0.15;
    const half = pieceSize / 2;

    const path = useDerivedValue(() => {
      const p = Skia.Path.Make();
      const moves = boardState.validMoves.get();
      for (let i = 0; i < moves.length; i++) {
        const pos = squareToPosition(moves[i], pieceSize, flipped);
        p.addCircle(pos.x + half, pos.y + half, radius);
      }
      return p;
    });

    return <Path path={path} color="rgba(0, 0, 0, 0.3)" opacity={0.5} />;
  }
);

SkiaDots.displayName = 'SkiaDots';
