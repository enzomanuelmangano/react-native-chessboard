"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HighlightedSquare = void 0;

var _react = _interopRequireWildcard(require("react"));

var _reactNative = require("react-native");

var _reactNativeReanimated = _interopRequireWildcard(require("react-native-reanimated"));

var _hooks = require("../../context/props-context/hooks");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const HighlightedSquareComponent = /*#__PURE__*/_react.default.forwardRef((_ref, ref) => {
  let {
    style
  } = _ref;
  const {
    colors: {
      lastMoveHighlight
    }
  } = (0, _hooks.useChessboardProps)();
  const backgroundColor = (0, _reactNativeReanimated.useSharedValue)(lastMoveHighlight);
  const isHighlighted = (0, _reactNativeReanimated.useSharedValue)(false);
  (0, _react.useImperativeHandle)(ref, () => ({
    reset: () => {
      isHighlighted.value = false;
    },
    highlight: function () {
      let {
        backgroundColor: bg
      } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      backgroundColor.value = bg !== null && bg !== void 0 ? bg : lastMoveHighlight;
      isHighlighted.value = true;
    },
    isHighlighted: () => isHighlighted.value
  }), [backgroundColor, isHighlighted, lastMoveHighlight]);
  const rHighlightedSquareStyle = (0, _reactNativeReanimated.useAnimatedStyle)(() => {
    return {
      opacity: (0, _reactNativeReanimated.withTiming)(isHighlighted.value ? 1 : 0),
      backgroundColor: backgroundColor.value
    };
  }, []);
  return /*#__PURE__*/_react.default.createElement(_reactNativeReanimated.default.View, {
    style: [styles.highlightedSquare, style, rHighlightedSquareStyle]
  });
});

const styles = _reactNative.StyleSheet.create({
  highlightedSquare: {
    position: 'absolute',
    aspectRatio: 1
  }
});

const HighlightedSquare = /*#__PURE__*/_react.default.memo(HighlightedSquareComponent);

exports.HighlightedSquare = HighlightedSquare;
//# sourceMappingURL=highlighted-square.js.map