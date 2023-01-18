"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ChessPiece = void 0;

var _react = _interopRequireDefault(require("react"));

var _reactNative = require("react-native");

var _constants = require("../../constants");

var _hooks = require("../../context/props-context/hooks");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

const ChessPiece = /*#__PURE__*/_react.default.memo(_ref => {
  var _renderPiece;

  let {
    id,
    ...rest
  } = _ref;
  const {
    pieceSize,
    renderPiece
  } = (0, _hooks.useChessboardProps)();
  return (_renderPiece = renderPiece === null || renderPiece === void 0 ? void 0 : renderPiece(id)) !== null && _renderPiece !== void 0 ? _renderPiece : /*#__PURE__*/_react.default.createElement(_reactNative.Image, _extends({
    style: [{
      width: pieceSize,
      height: pieceSize
    }, rest.style]
  }, rest, {
    source: _constants.PIECES[id]
  }));
});

exports.ChessPiece = ChessPiece;
//# sourceMappingURL=visual-piece.js.map