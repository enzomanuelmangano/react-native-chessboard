import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ChessPiece } from '../../../components/piece/visual-piece';
import { useChessboardProps } from '../../../context/props-context/hooks';
const DialogPiece = /*#__PURE__*/React.memo(_ref => {
  let {
    index,
    width,
    type,
    piece,
    onSelectPiece
  } = _ref;
  const isTapActive = useSharedValue(false);
  const {
    colors: {
      promotionPieceButton
    }
  } = useChessboardProps();
  const gesture = Gesture.Tap().onBegin(() => {
    isTapActive.value = true;
  }).onTouchesUp(() => {
    if (onSelectPiece) runOnJS(onSelectPiece)(piece);
  }).onFinalize(() => {
    isTapActive.value = false;
  }).shouldCancelWhenOutside(true).maxDuration(10000);
  const rStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isTapActive.value ? 1 : 0, {
        duration: 150
      })
    };
  }, []);
  return /*#__PURE__*/React.createElement(GestureDetector, {
    gesture: gesture
  }, /*#__PURE__*/React.createElement(Animated.View, null, /*#__PURE__*/React.createElement(Animated.View, {
    style: [{
      width,
      position: 'absolute',
      backgroundColor: promotionPieceButton,
      aspectRatio: 1,
      borderTopLeftRadius: index === 0 ? 5 : 0,
      borderBottomLeftRadius: index === 1 ? 5 : 0,
      borderTopRightRadius: index === 2 ? 5 : 0,
      borderBottomRightRadius: index === 3 ? 5 : 0
    }, rStyle]
  }), /*#__PURE__*/React.createElement(View, {
    style: [{
      width,
      borderLeftWidth: index === 3 || index === 2 ? 1 : 0,
      borderTopWidth: index % 2 !== 0 ? 1 : 0
    }, styles.pieceContainer]
  }, /*#__PURE__*/React.createElement(ChessPiece, {
    id: `${type}${piece}`
  }))));
});
const styles = StyleSheet.create({
  pieceContainer: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0,
    borderColor: 'rgba(0,0,0,0.2)'
  }
});
export { DialogPiece };
//# sourceMappingURL=dialog-piece.js.map