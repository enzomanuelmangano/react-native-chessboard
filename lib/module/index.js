import React, { useImperativeHandle, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Background from './components/chessboard-background';
import { HighlightedSquares } from './components/highlighted-squares';
import { Pieces } from './components/pieces';
import { SuggestedDots } from './components/suggested-dots';
import { ChessboardContextProvider } from './context/board-context-provider';
import { ChessboardPropsContextProvider, DEFAULT_BOARD_SIZE } from './context/props-context';
import { useChessboardProps } from './context/props-context/hooks';
const styles = StyleSheet.create({
  container: {
    aspectRatio: 1
  }
});
const Chessboard = /*#__PURE__*/React.memo(() => {
  const {
    boardSize
  } = useChessboardProps();
  return /*#__PURE__*/React.createElement(View, {
    style: [styles.container, {
      width: boardSize
    }]
  }, /*#__PURE__*/React.createElement(Background, null), /*#__PURE__*/React.createElement(Pieces, null), /*#__PURE__*/React.createElement(HighlightedSquares, null), /*#__PURE__*/React.createElement(SuggestedDots, null));
});
const ChessboardContainerComponent = /*#__PURE__*/React.forwardRef((props, ref) => {
  const chessboardRef = useRef(null);
  useImperativeHandle(ref, () => ({
    move: params => {
      var _chessboardRef$curren, _chessboardRef$curren2;

      return (_chessboardRef$curren = chessboardRef.current) === null || _chessboardRef$curren === void 0 ? void 0 : (_chessboardRef$curren2 = _chessboardRef$curren.move) === null || _chessboardRef$curren2 === void 0 ? void 0 : _chessboardRef$curren2.call(_chessboardRef$curren, params);
    },
    highlight: params => {
      var _chessboardRef$curren3;

      return (_chessboardRef$curren3 = chessboardRef.current) === null || _chessboardRef$curren3 === void 0 ? void 0 : _chessboardRef$curren3.highlight(params);
    },
    resetAllHighlightedSquares: () => {
      var _chessboardRef$curren4;

      return (_chessboardRef$curren4 = chessboardRef.current) === null || _chessboardRef$curren4 === void 0 ? void 0 : _chessboardRef$curren4.resetAllHighlightedSquares();
    },
    getState: () => {
      var _chessboardRef$curren5;

      return chessboardRef === null || chessboardRef === void 0 ? void 0 : (_chessboardRef$curren5 = chessboardRef.current) === null || _chessboardRef$curren5 === void 0 ? void 0 : _chessboardRef$curren5.getState();
    },
    resetBoard: params => {
      var _chessboardRef$curren6;

      return (_chessboardRef$curren6 = chessboardRef.current) === null || _chessboardRef$curren6 === void 0 ? void 0 : _chessboardRef$curren6.resetBoard(params);
    }
  }), []);
  return /*#__PURE__*/React.createElement(ChessboardPropsContextProvider, props, /*#__PURE__*/React.createElement(ChessboardContextProvider, {
    ref: chessboardRef,
    fen: props.fen
  }, /*#__PURE__*/React.createElement(Chessboard, null)));
});
const ChessboardContainer = /*#__PURE__*/React.memo(ChessboardContainerComponent);
export { DEFAULT_BOARD_SIZE };
export default ChessboardContainer;
//# sourceMappingURL=index.js.map