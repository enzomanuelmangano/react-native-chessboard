import type { Square } from 'chess.js';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { SIZE, toPosition, toTranslation } from '../../notation';

type PlaceholderDotProps = {
  x: number;
  y: number;
  selectableSquares: Animated.SharedValue<Square[]>;
  moveTo?: (to: Square) => void;
};

const PlaceholderDot: React.FC<PlaceholderDotProps> = React.memo(
  ({ x, y, selectableSquares, moveTo }) => {
    const currentSquare = toPosition({ x: x * SIZE, y: y * SIZE });
    const translation = toTranslation(currentSquare);

    const isSelectable = useDerivedValue(() => {
      'worklet';
      return (
        selectableSquares.value
          .map((square) => square.includes(currentSquare))
          .filter((v) => v).length > 0
      );
    }, [currentSquare, selectableSquares.value]);

    const rPlaceholderStyle = useAnimatedStyle(() => {
      const canBeSelected = isSelectable.value;
      return { opacity: withTiming(canBeSelected ? 0.15 : 0) };
    }, []);

    return (
      <View
        onTouchEnd={() => {
          if (isSelectable.value && moveTo) {
            runOnJS(moveTo)(currentSquare);
          }
        }}
        style={[
          styles.placeholderContainer,
          {
            transform: [
              { translateX: translation.x },
              { translateY: translation.y },
            ],
          },
        ]}
      >
        <Animated.View style={[styles.placeholder, rPlaceholderStyle]} />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  placeholderContainer: {
    width: SIZE,
    position: 'absolute',
    aspectRatio: 1,
    padding: SIZE / 3.2,
    backgroundColor: 'transparent',
  },
  placeholder: {
    flex: 1,
    backgroundColor: 'black',
    borderRadius: SIZE,
    opacity: 0.2,
  },
});

export { PlaceholderDot };
