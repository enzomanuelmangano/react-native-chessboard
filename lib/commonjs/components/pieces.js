"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Pieces = void 0;

var _react = _interopRequireDefault(require("react"));

var _hooks = require("../context/props-context/hooks");

var _hooks2 = require("../context/board-context/hooks");

var _hooks3 = require("../context/board-refs-context/hooks");

var _piece = _interopRequireDefault(require("./piece"));

var _notation = require("../notation");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const Pieces = /*#__PURE__*/_react.default.memo(() => {
  const board = (0, _hooks2.useBoard)();
  const refs = (0, _hooks3.usePieceRefs)();
  const {
    pieceSize
  } = (0, _hooks.useChessboardProps)();
  const {
    toPosition
  } = (0, _notation.useReversePiecePosition)();
  return /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, board.map((row, y) => row.map((piece, x) => {
    if (piece !== null) {
      var _refs$current;

      const square = toPosition({
        x: x * pieceSize,
        y: y * pieceSize
      });
      return /*#__PURE__*/_react.default.createElement(_piece.default, {
        ref: refs === null || refs === void 0 ? void 0 : (_refs$current = refs.current) === null || _refs$current === void 0 ? void 0 : _refs$current[square],
        key: `${x}-${y}`,
        id: `${piece.color}${piece.type}`,
        startPosition: {
          x,
          y
        },
        square: square,
        size: pieceSize
      });
    }

    return null;
  })));
});

exports.Pieces = Pieces;
//# sourceMappingURL=pieces.js.map