"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireDefault(require("react"));

var _reactNative = require("react-native");

var _hooks = require("../context/props-context/hooks");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

const styles = _reactNative.StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row'
  }
});

const Square = /*#__PURE__*/_react.default.memo(_ref => {
  let {
    white,
    row,
    col,
    letters,
    numbers
  } = _ref;
  const {
    colors
  } = (0, _hooks.useChessboardProps)();
  const backgroundColor = white ? colors.black : colors.white;
  const color = white ? colors.white : colors.black;
  const textStyle = {
    fontWeight: '500',
    fontSize: 10,
    color
  };
  const newLocal = col === 0;
  return /*#__PURE__*/_react.default.createElement(_reactNative.View, {
    style: {
      flex: 1,
      backgroundColor,
      padding: 4,
      justifyContent: 'space-between'
    }
  }, numbers && /*#__PURE__*/_react.default.createElement(_reactNative.Text, {
    style: [textStyle, {
      opacity: newLocal ? 1 : 0
    }]
  }, '' + (8 - row)), row === 7 && letters && /*#__PURE__*/_react.default.createElement(_reactNative.Text, {
    style: [textStyle, {
      alignSelf: 'flex-end'
    }]
  }, String.fromCharCode(97 + col)));
});

const Row = /*#__PURE__*/_react.default.memo(_ref2 => {
  let {
    white,
    row,
    ...rest
  } = _ref2;
  const offset = white ? 0 : 1;
  return /*#__PURE__*/_react.default.createElement(_reactNative.View, {
    style: styles.container
  }, new Array(8).fill(0).map((_, i) => /*#__PURE__*/_react.default.createElement(Square, _extends({}, rest, {
    row: row,
    col: i,
    key: i,
    white: (i + offset) % 2 === 1
  }))));
});

const Background = /*#__PURE__*/_react.default.memo(() => {
  const {
    withLetters,
    withNumbers
  } = (0, _hooks.useChessboardProps)();
  return /*#__PURE__*/_react.default.createElement(_reactNative.View, {
    style: {
      flex: 1
    }
  }, new Array(8).fill(0).map((_, i) => /*#__PURE__*/_react.default.createElement(Row, {
    key: i,
    white: i % 2 === 0,
    row: i,
    letters: withLetters,
    numbers: withNumbers
  })));
});

var _default = Background;
exports.default = _default;
//# sourceMappingURL=chessboard-background.js.map