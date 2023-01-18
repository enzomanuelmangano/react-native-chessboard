"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HighlightedSquares = void 0;

var _react = _interopRequireWildcard(require("react"));

var _reactNative = require("react-native");

var _hooks = require("../../context/props-context/hooks");

var _hooks2 = require("../../context/chess-engine-context/hooks");

var _notation = require("../../notation");

var _highlightedSquare = require("./highlighted-square");

var _hooks3 = require("../../context/board-refs-context/hooks");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const HighlightedSquares = /*#__PURE__*/_react.default.memo(() => {
  const chess = (0, _hooks2.useChessEngine)();
  const board = (0, _react.useMemo)(() => chess.board(), [chess]);
  const {
    pieceSize
  } = (0, _hooks.useChessboardProps)();
  const {
    toPosition,
    toTranslation
  } = (0, _notation.useReversePiecePosition)();
  const refs = (0, _hooks3.useSquareRefs)();
  return /*#__PURE__*/_react.default.createElement(_reactNative.View, {
    style: { ..._reactNative.StyleSheet.absoluteFillObject
    }
  }, board.map((row, y) => row.map((_, x) => {
    var _refs$current;

    const square = toPosition({
      x: x * pieceSize,
      y: y * pieceSize
    });
    const translation = toTranslation(square);
    return /*#__PURE__*/_react.default.createElement(_highlightedSquare.HighlightedSquare, {
      key: `${x}-${y}`,
      ref: refs === null || refs === void 0 ? void 0 : (_refs$current = refs.current) === null || _refs$current === void 0 ? void 0 : _refs$current[square],
      style: [styles.highlightedSquare, {
        width: pieceSize,
        transform: [{
          translateX: translation.x
        }, {
          translateY: translation.y
        }]
      }]
    });
  })));
});

exports.HighlightedSquares = HighlightedSquares;

const styles = _reactNative.StyleSheet.create({
  highlightedSquare: {
    position: 'absolute',
    aspectRatio: 1
  }
});
//# sourceMappingURL=index.js.map