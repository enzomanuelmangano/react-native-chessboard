"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PromotionDialog = void 0;

var _hooks = require("../../../context/props-context/hooks");

var _react = _interopRequireDefault(require("react"));

var _reactNativeReanimated = _interopRequireWildcard(require("react-native-reanimated"));

var _reactNative = require("react-native");

var _dialogPiece = require("./dialog-piece");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const PROMOTION_PIECES = ['q', 'r', 'n', 'b'];

const PromotionDialog = /*#__PURE__*/_react.default.memo(_ref => {
  let {
    type,
    onSelect
  } = _ref;
  const {
    boardSize
  } = (0, _hooks.useChessboardProps)();
  return /*#__PURE__*/_react.default.createElement(_reactNativeReanimated.default.View, {
    entering: _reactNativeReanimated.FadeIn,
    exiting: _reactNativeReanimated.FadeOut,
    style: [{
      width: boardSize / 3
    }, styles.container]
  }, PROMOTION_PIECES.map((piece, i) => {
    return /*#__PURE__*/_react.default.createElement(_dialogPiece.DialogPiece, {
      key: i,
      width: boardSize / 6,
      index: i,
      piece: piece,
      type: type,
      onSelectPiece: onSelect
    });
  }));
});

exports.PromotionDialog = PromotionDialog;

const styles = _reactNative.StyleSheet.create({
  container: {
    position: 'absolute',
    aspectRatio: 1,
    backgroundColor: 'rgba(256,256,256,0.85)',
    borderRadius: 5,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'black',
    shadowOpacity: 0.2,
    shadowOffset: {
      height: 5,
      width: 0
    },
    flexWrap: 'wrap'
  }
});
//# sourceMappingURL=index.js.map