import React, { useImperativeHandle } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useChessboardProps } from '../../context/props-context/hooks';
const HighlightedSquareComponent = /*#__PURE__*/React.forwardRef((_ref, ref) => {
  let {
    style
  } = _ref;
  const {
    colors: {
      lastMoveHighlight
    }
  } = useChessboardProps();
  const backgroundColor = useSharedValue(lastMoveHighlight);
  const isHighlighted = useSharedValue(false);
  useImperativeHandle(ref, () => ({
    reset: () => {
      isHighlighted.value = false;
    },
    highlight: function () {
      let {
        backgroundColor: bg
      } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      backgroundColor.value = bg !== null && bg !== void 0 ? bg : lastMoveHighlight;
      isHighlighted.value = true;
    },
    isHighlighted: () => isHighlighted.value
  }), [backgroundColor, isHighlighted, lastMoveHighlight]);
  const rHighlightedSquareStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isHighlighted.value ? 1 : 0),
      backgroundColor: backgroundColor.value
    };
  }, []);
  return /*#__PURE__*/React.createElement(Animated.View, {
    style: [styles.highlightedSquare, style, rHighlightedSquareStyle]
  });
});
const styles = StyleSheet.create({
  highlightedSquare: {
    position: 'absolute',
    aspectRatio: 1
  }
});
const HighlightedSquare = /*#__PURE__*/React.memo(HighlightedSquareComponent);
export { HighlightedSquare };
//# sourceMappingURL=highlighted-square.js.map