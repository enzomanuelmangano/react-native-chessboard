"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DialogPiece = void 0;

var _react = _interopRequireDefault(require("react"));

var _reactNative = require("react-native");

var _reactNativeGestureHandler = require("react-native-gesture-handler");

var _reactNativeReanimated = _interopRequireWildcard(require("react-native-reanimated"));

var _visualPiece = require("../../../components/piece/visual-piece");

var _hooks = require("../../../context/props-context/hooks");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const DialogPiece = /*#__PURE__*/_react.default.memo(_ref => {
  let {
    index,
    width,
    type,
    piece,
    onSelectPiece
  } = _ref;
  const isTapActive = (0, _reactNativeReanimated.useSharedValue)(false);
  const {
    colors: {
      promotionPieceButton
    }
  } = (0, _hooks.useChessboardProps)();

  const gesture = _reactNativeGestureHandler.Gesture.Tap().onBegin(() => {
    isTapActive.value = true;
  }).onTouchesUp(() => {
    if (onSelectPiece) (0, _reactNativeReanimated.runOnJS)(onSelectPiece)(piece);
  }).onFinalize(() => {
    isTapActive.value = false;
  }).shouldCancelWhenOutside(true).maxDuration(10000);

  const rStyle = (0, _reactNativeReanimated.useAnimatedStyle)(() => {
    return {
      opacity: (0, _reactNativeReanimated.withTiming)(isTapActive.value ? 1 : 0, {
        duration: 150
      })
    };
  }, []);
  return /*#__PURE__*/_react.default.createElement(_reactNativeGestureHandler.GestureDetector, {
    gesture: gesture
  }, /*#__PURE__*/_react.default.createElement(_reactNativeReanimated.default.View, null, /*#__PURE__*/_react.default.createElement(_reactNativeReanimated.default.View, {
    style: [{
      width,
      position: 'absolute',
      backgroundColor: promotionPieceButton,
      aspectRatio: 1,
      borderTopLeftRadius: index === 0 ? 5 : 0,
      borderBottomLeftRadius: index === 1 ? 5 : 0,
      borderTopRightRadius: index === 2 ? 5 : 0,
      borderBottomRightRadius: index === 3 ? 5 : 0
    }, rStyle]
  }), /*#__PURE__*/_react.default.createElement(_reactNative.View, {
    style: [{
      width,
      borderLeftWidth: index === 3 || index === 2 ? 1 : 0,
      borderTopWidth: index % 2 !== 0 ? 1 : 0
    }, styles.pieceContainer]
  }, /*#__PURE__*/_react.default.createElement(_visualPiece.ChessPiece, {
    id: `${type}${piece}`
  }))));
});

exports.DialogPiece = DialogPiece;

const styles = _reactNative.StyleSheet.create({
  pieceContainer: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0,
    borderColor: 'rgba(0,0,0,0.2)'
  }
});
//# sourceMappingURL=dialog-piece.js.map