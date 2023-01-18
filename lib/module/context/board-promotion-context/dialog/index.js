import { useChessboardProps } from '../../../context/props-context/hooks';
import React from 'react';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { StyleSheet } from 'react-native';
import { DialogPiece } from './dialog-piece';
const PROMOTION_PIECES = ['q', 'r', 'n', 'b'];
const PromotionDialog = /*#__PURE__*/React.memo(_ref => {
  let {
    type,
    onSelect
  } = _ref;
  const {
    boardSize
  } = useChessboardProps();
  return /*#__PURE__*/React.createElement(Animated.View, {
    entering: FadeIn,
    exiting: FadeOut,
    style: [{
      width: boardSize / 3
    }, styles.container]
  }, PROMOTION_PIECES.map((piece, i) => {
    return /*#__PURE__*/React.createElement(DialogPiece, {
      key: i,
      width: boardSize / 6,
      index: i,
      piece: piece,
      type: type,
      onSelectPiece: onSelect
    });
  }));
});
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    aspectRatio: 1,
    backgroundColor: 'rgba(256,256,256,0.85)',
    borderRadius: 5,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'black',
    shadowOpacity: 0.2,
    shadowOffset: {
      height: 5,
      width: 0
    },
    flexWrap: 'wrap'
  }
});
export { PromotionDialog };
//# sourceMappingURL=index.js.map