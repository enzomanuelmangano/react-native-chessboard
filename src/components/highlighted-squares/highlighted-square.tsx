import React, { useImperativeHandle } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useChessboardProps } from '../../context/props-context/hooks';

type HighlightedSquareProps = {
  style?: StyleProp<ViewStyle>;
};

export type HighlightedSquareRefType = {
  isHighlighted: () => boolean;
  reset: () => void;
  highlight: (_?: { backgroundColor?: string }) => void;
};

const HighlightedSquareComponent = React.forwardRef<
  HighlightedSquareRefType,
  HighlightedSquareProps
>(({ style }, ref) => {
  const {
    colors: { squareHighlight },
  } = useChessboardProps();
  const backgroundColor = useSharedValue(squareHighlight);
  const isHighlighted = useSharedValue(false);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        isHighlighted.value = false;
      },
      highlight: ({ backgroundColor: bg } = {}) => {
        backgroundColor.value = bg ?? squareHighlight;
        isHighlighted.value = true;
      },
      isHighlighted: () => isHighlighted.value,
    }),
    [backgroundColor, isHighlighted, squareHighlight]
  );

  const rHighlightedSquareStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isHighlighted.value ? 1 : 0),
      backgroundColor: backgroundColor.value,
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
