import React, { useImperativeHandle } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type HighlightedSquareProps = {
  style?: StyleProp<ViewStyle>;
};

export type HighlightedSquareRefType = {
  isHighlighted: () => boolean;
  reset: () => void;
  highlight: (_?: { backgroundColor?: string }) => void;
};

const DEFAULT_HIGHLIGHTED_COLOR = 'rgba(255,255,0, 0.5)';

const HighlightedSquareComponent = React.forwardRef<
  HighlightedSquareRefType,
  HighlightedSquareProps
>(({ style }, ref) => {
  const backgroundColor = useSharedValue(DEFAULT_HIGHLIGHTED_COLOR);
  const isHighlighted = useSharedValue(false);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        isHighlighted.value = false;
      },
      highlight: ({ backgroundColor: bg } = {}) => {
        backgroundColor.value = bg ?? DEFAULT_HIGHLIGHTED_COLOR;
        isHighlighted.value = true;
      },
      isHighlighted: () => isHighlighted.value,
    }),
    [backgroundColor, isHighlighted]
  );

  const rHighlightedSquareStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isHighlighted.value ? 1 : 0),
      backgroundColor: DEFAULT_HIGHLIGHTED_COLOR,
    };
  }, []);

  return (
    <Animated.View
      style={[styles.highlightedSquare, style, rHighlightedSquareStyle]}
    />
  );
});

const styles = StyleSheet.create({
  highlightedSquare: {
    position: 'absolute',
    aspectRatio: 1,
  },
});

const HighlightedSquare = React.memo(HighlightedSquareComponent);

export { HighlightedSquare };
