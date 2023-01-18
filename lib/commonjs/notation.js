"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useReversePiecePosition = void 0;

var _react = require("react");

var _hooks = require("./context/props-context/hooks");

const useReversePiecePosition = () => {
  const {
    pieceSize
  } = (0, _hooks.useChessboardProps)();
  const toTranslation = (0, _react.useCallback)(to => {
    'worklet';

    const tokens = to.split('');
    const col = tokens[0];
    const row = tokens[1];

    if (!col || !row) {
      throw new Error('Invalid notation: ' + to);
    }

    const indexes = {
      x: col.charCodeAt(0) - 'a'.charCodeAt(0),
      y: parseInt(row, 10) - 1
    };
    return {
      x: indexes.x * pieceSize,
      y: 7 * pieceSize - indexes.y * pieceSize
    };
  }, [pieceSize]);
  const toPosition = (0, _react.useCallback)(_ref => {
    'worklet';

    let {
      x,
      y
    } = _ref;
    const col = String.fromCharCode(97 + Math.round(x / pieceSize));
    const row = `${8 - Math.round(y / pieceSize)}`;
    return `${col}${row}`;
  }, [pieceSize]);
  return {
    toPosition,
    toTranslation
  };
};

exports.useReversePiecePosition = useReversePiecePosition;
//# sourceMappingURL=notation.js.map