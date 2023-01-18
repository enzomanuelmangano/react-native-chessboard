"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "DEFAULT_BOARD_SIZE", {
  enumerable: true,
  get: function () {
    return _propsContext.DEFAULT_BOARD_SIZE;
  }
});
exports.default = void 0;

var _react = _interopRequireWildcard(require("react"));

var _reactNative = require("react-native");

var _chessboardBackground = _interopRequireDefault(require("./components/chessboard-background"));

var _highlightedSquares = require("./components/highlighted-squares");

var _pieces = require("./components/pieces");

var _suggestedDots = require("./components/suggested-dots");

var _boardContextProvider = require("./context/board-context-provider");

var _propsContext = require("./context/props-context");

var _hooks = require("./context/props-context/hooks");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const styles = _reactNative.StyleSheet.create({
  container: {
    aspectRatio: 1
  }
});

const Chessboard = /*#__PURE__*/_react.default.memo(() => {
  const {
    boardSize
  } = (0, _hooks.useChessboardProps)();
  return /*#__PURE__*/_react.default.createElement(_reactNative.View, {
    style: [styles.container, {
      width: boardSize
    }]
  }, /*#__PURE__*/_react.default.createElement(_chessboardBackground.default, null), /*#__PURE__*/_react.default.createElement(_pieces.Pieces, null), /*#__PURE__*/_react.default.createElement(_highlightedSquares.HighlightedSquares, null), /*#__PURE__*/_react.default.createElement(_suggestedDots.SuggestedDots, null));
});

const ChessboardContainerComponent = /*#__PURE__*/_react.default.forwardRef((props, ref) => {
  const chessboardRef = (0, _react.useRef)(null);
  (0, _react.useImperativeHandle)(ref, () => ({
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
  return /*#__PURE__*/_react.default.createElement(_propsContext.ChessboardPropsContextProvider, props, /*#__PURE__*/_react.default.createElement(_boardContextProvider.ChessboardContextProvider, {
    ref: chessboardRef,
    fen: props.fen
  }, /*#__PURE__*/_react.default.createElement(Chessboard, null)));
});

const ChessboardContainer = /*#__PURE__*/_react.default.memo(ChessboardContainerComponent);

var _default = ChessboardContainer;
exports.default = _default;
//# sourceMappingURL=index.js.map