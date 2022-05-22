import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { useBoardOperations } from '../../context/board-operations-context/hooks';
import { useChessEngine } from '../../context/chess-engine-context/hooks';
import { SIZE, toPosition, toTranslation } from '../../notation';

const HighlightedSquares: React.FC = React.memo(() => {
  const chess = useChessEngine();
  const { lastMove } = useBoardOperations();
  const board = useMemo(() => chess.board(), [chess]);

  return (
    <View
      style={{
        ...StyleSheet.absoluteFillObject,
      }}
    >
      {board.map((row, y) =>
        row.map((_, x) => {
          const square = toPosition({ x: x * SIZE, y: y * SIZE });
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
    width: SIZE,
    position: 'absolute',
    aspectRatio: 1,
  },
});

export { HighlightedSquares };
