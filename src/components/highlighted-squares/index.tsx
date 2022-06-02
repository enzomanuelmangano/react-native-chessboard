import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useChessboardProps } from '../../context/props-context/hooks';

import { useBoardOperations } from '../../context/board-operations-context/hooks';
import { useChessEngine } from '../../context/chess-engine-context/hooks';
import { useReversePiecePosition } from '../../notation';

const HighlightedSquares: React.FC = React.memo(() => {
  const chess = useChessEngine();
  const { lastMove } = useBoardOperations();
  const board = useMemo(() => chess.board(), [chess]);
  const { pieceSize } = useChessboardProps();
  const { toPosition, toTranslation } = useReversePiecePosition();

  return (
    <View
      style={{
        ...StyleSheet.absoluteFillObject,
      }}
    >
      {board.map((row, y) =>
        row.map((_, x) => {
          const square = toPosition({ x: x * pieceSize, y: y * pieceSize });
          const translation = toTranslation(square);
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const rHighlightedSquareStyle = useAnimatedStyle(() => {
            const isInLastMove =
              square === lastMove.value?.from || square === lastMove.value?.to;

            return {
              opacity: withTiming(isInLastMove ? 0.5 : 0),
              backgroundColor: 'rgba(255,255,0, 1)',
            };
          }, []);

          return (
            <Animated.View
              key={`${x}-${y}`}
              style={[
                styles.highlightedSquare,
                {
                  width: pieceSize,
                  transform: [
                    { translateX: translation.x },
                    { translateY: translation.y },
                  ],
                },
                rHighlightedSquareStyle,
              ]}
            />
          );
        })
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  highlightedSquare: {
    position: 'absolute',
    aspectRatio: 1,
  },
});

export { HighlightedSquares };
