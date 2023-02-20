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
  highlight: (_?: { backgroundColor?: string; borderColor?: string }) => void;
};

const HighlightedSquareComponent = React.forwardRef<
  HighlightedSquareRefType,
  HighlightedSquareProps
>(({ style }, ref) => {
  const {
    colors: { lastMoveHighlight },
  } = useChessboardProps();
  const backgroundColor = useSharedValue(lastMoveHighlight);
  const isHighlighted = useSharedValue(false);
  const borderColor = useSharedValue(lastMoveHighlight);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        isHighlighted.value = false;
      },
      highlight: ({ backgroundColor: bg, borderColor: border } = {}) => {
        backgroundColor.value = bg ?? lastMoveHighlight;
        isHighlighted.value = true;
        borderColor.value = border ?? lastMoveHighlight;
      },
      isHighlighted: () => isHighlighted.value,
    }),
    [backgroundColor, isHighlighted, lastMoveHighlight, borderColor]
  );

  const rHighlightedSquareStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isHighlighted.value ? 1 : 0),
      backgroundColor: backgroundColor.value,
      borderWidth: 0.5,
      borderColor: borderColor.value,
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
