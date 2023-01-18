"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PlaceholderDot = void 0;

var _react = _interopRequireWildcard(require("react"));

var _reactNative = require("react-native");

var _reactNativeReanimated = _interopRequireWildcard(require("react-native-reanimated"));

var _hooks = require("../../context/props-context/hooks");

var _notation = require("../../notation");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const PlaceholderDot = /*#__PURE__*/_react.default.memo(_ref => {
  let {
    x,
    y,
    selectableSquares,
    moveTo
  } = _ref;
  const {
    pieceSize
  } = (0, _hooks.useChessboardProps)();
  const {
    toPosition,
    toTranslation
  } = (0, _notation.useReversePiecePosition)();
  const currentSquare = toPosition({
    x: x * pieceSize,
    y: y * pieceSize
  });
  const translation = (0, _react.useMemo)(() => toTranslation(currentSquare), [currentSquare, toTranslation]);
  const isSelectable = (0, _reactNativeReanimated.useDerivedValue)(() => {
    'worklet';

    return selectableSquares.value.map(square => square.includes(currentSquare)).filter(v => v).length > 0;
  }, [currentSquare, selectableSquares.value]);
  const rPlaceholderStyle = (0, _reactNativeReanimated.useAnimatedStyle)(() => {
    const canBeSelected = isSelectable.value;
    return {
      opacity: (0, _reactNativeReanimated.withTiming)(canBeSelected ? 0.15 : 0)
    };
  }, []);
  return /*#__PURE__*/_react.default.createElement(_reactNative.View, {
    onTouchEnd: () => {
      if (isSelectable.value && moveTo) {
        (0, _reactNativeReanimated.runOnJS)(moveTo)(currentSquare);
      }
    },
    style: [styles.placeholderContainer, {
      width: pieceSize,
      padding: pieceSize / 3.2,
      transform: [{
        translateX: translation.x
      }, {
        translateY: translation.y
      }]
    }]
  }, /*#__PURE__*/_react.default.createElement(_reactNativeReanimated.default.View, {
    style: [{
      borderRadius: pieceSize
    }, styles.placeholder, rPlaceholderStyle]
  }));
});

exports.PlaceholderDot = PlaceholderDot;

const styles = _reactNative.StyleSheet.create({
  placeholderContainer: {
    position: 'absolute',
    aspectRatio: 1,
    backgroundColor: 'transparent'
  },
  placeholder: {
    flex: 1,
    backgroundColor: 'black',
    opacity: 0.2
  }
});
//# sourceMappingURL=PlaceholderDot.js.map