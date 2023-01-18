"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SuggestedDots = void 0;

var _react = _interopRequireWildcard(require("react"));

var _reactNative = require("react-native");

var _hooks = require("../../context/board-operations-context/hooks");

var _hooks2 = require("../../context/chess-engine-context/hooks");

var _PlaceholderDot = require("./PlaceholderDot");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const SuggestedDots = /*#__PURE__*/_react.default.memo(() => {
  const chess = (0, _hooks2.useChessEngine)();
  const {
    moveTo,
    selectableSquares
  } = (0, _hooks.useBoardOperations)();
  const board = (0, _react.useMemo)(() => chess.board(), [chess]);
  return /*#__PURE__*/_react.default.createElement(_reactNative.View, {
    style: { ..._reactNative.StyleSheet.absoluteFillObject
    }
  }, board.map((row, y) => row.map((_, x) => {
    return /*#__PURE__*/_react.default.createElement(_PlaceholderDot.PlaceholderDot, {
      key: `${x}-${y}`,
      x: x,
      y: y,
      selectableSquares: selectableSquares,
      moveTo: moveTo
    });
  })));
});

exports.SuggestedDots = SuggestedDots;
//# sourceMappingURL=index.js.map