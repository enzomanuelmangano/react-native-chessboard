"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireWildcard(require("react"));

var _reactNativeGestureHandler = require("react-native-gesture-handler");

var _reactNativeReanimated = _interopRequireWildcard(require("react-native-reanimated"));

var _hooks = require("../../context/props-context/hooks");

var _hooks2 = require("../../context/board-operations-context/hooks");

var _hooks3 = require("../../context/board-promotion-context/hooks");

var _hooks4 = require("../../context/board-refs-context/hooks");

var _hooks5 = require("../../context/chess-engine-context/hooks");

var _notation = require("../../notation");

var _visualPiece = require("./visual-piece");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const Piece = /*#__PURE__*/_react.default.memo( /*#__PURE__*/_react.default.forwardRef((_ref, ref) => {
  let {
    id,
    startPosition,
    square,
    size
  } = _ref;
  const chess = (0, _hooks5.useChessEngine)();
  const refs = (0, _hooks4.usePieceRefs)();
  const pieceEnabled = (0, _reactNativeReanimated.useSharedValue)(true);
  const {
    isPromoting
  } = (0, _hooks3.useBoardPromotion)();
  const {
    onSelectPiece,
    onMove,
    selectedSquare,
    turn
  } = (0, _hooks2.useBoardOperations)();
  const {
    durations: {
      move: moveDuration
    },
    gestureEnabled: gestureEnabledFromChessboardProps
  } = (0, _hooks.useChessboardProps)();
  const gestureEnabled = (0, _reactNativeReanimated.useDerivedValue)(() => turn.value === id.charAt(0) && gestureEnabledFromChessboardProps, [id, gestureEnabledFromChessboardProps]);
  const {
    toPosition,
    toTranslation
  } = (0, _notation.useReversePiecePosition)();
  const isGestureActive = (0, _reactNativeReanimated.useSharedValue)(false);
  const offsetX = (0, _reactNativeReanimated.useSharedValue)(0);
  const offsetY = (0, _reactNativeReanimated.useSharedValue)(0);
  const scale = (0, _reactNativeReanimated.useSharedValue)(1);
  const translateX = (0, _reactNativeReanimated.useSharedValue)(startPosition.x * size);
  const translateY = (0, _reactNativeReanimated.useSharedValue)(startPosition.y * size);
  const validateMove = (0, _react.useCallback)((from, to) => {
    return chess.moves({
      verbose: true
    }).find(m => m.from === from && m.to === to);
  }, [chess]);
  const wrappedOnMoveForJSThread = (0, _react.useCallback)(_ref2 => {
    let {
      move
    } = _ref2;
    onMove(move.from, move.to);
  }, [onMove]);
  const moveTo = (0, _react.useCallback)((from, to) => {
    return new Promise(resolve => {
      const move = validateMove(from, to);
      const {
        x,
        y
      } = toTranslation(move ? move.to : from);
      translateX.value = (0, _reactNativeReanimated.withTiming)(x, {
        duration: moveDuration
      }, () => {
        offsetX.value = translateX.value;
      });
      translateY.value = (0, _reactNativeReanimated.withTiming)(y, {
        duration: moveDuration
      }, isFinished => {
        if (!isFinished) return;
        offsetY.value = translateY.value;
        isGestureActive.value = false;

        if (move) {
          (0, _reactNativeReanimated.runOnJS)(wrappedOnMoveForJSThread)({
            move
          }); // Ideally I must call the resolve method
          // inside the "wrappedOnMoveForJSThread" after
          // the "onMove" function.
          // Unfortunately I'm not able to pass a
          // function in the RunOnJS params

          (0, _reactNativeReanimated.runOnJS)(resolve)(move);
        } else {
          (0, _reactNativeReanimated.runOnJS)(resolve)(undefined);
        }
      });
    });
  }, [isGestureActive, moveDuration, offsetX, offsetY, toTranslation, translateX, translateY, validateMove, wrappedOnMoveForJSThread]);
  const movePiece = (0, _react.useCallback)(to => {
    const from = toPosition({
      x: offsetX.value,
      y: offsetY.value
    });
    moveTo(from, to);
  }, [moveTo, offsetX.value, offsetY.value, toPosition]);
  (0, _react.useImperativeHandle)(ref, () => {
    return {
      moveTo: to => {
        return moveTo(square, to);
      },
      enable: active => {
        pieceEnabled.value = active;
      }
    };
  }, [moveTo, pieceEnabled, square]);
  const onStartTap = (0, _react.useCallback)( // eslint-disable-next-line no-shadow
  square => {
    'worklet';

    if (!onSelectPiece) {
      return;
    }

    (0, _reactNativeReanimated.runOnJS)(onSelectPiece)(square);
  }, [onSelectPiece]);
  const globalMoveTo = (0, _react.useCallback)(move => {
    var _refs$current, _refs$current$move$fr, _refs$current$move$fr2;

    refs === null || refs === void 0 ? void 0 : (_refs$current = refs.current) === null || _refs$current === void 0 ? void 0 : (_refs$current$move$fr = (_refs$current$move$fr2 = _refs$current[move.from].current).moveTo) === null || _refs$current$move$fr === void 0 ? void 0 : _refs$current$move$fr.call(_refs$current$move$fr2, move.to);
  }, [refs]);
  const handleOnBegin = (0, _react.useCallback)(() => {
    const currentSquare = toPosition({
      x: translateX.value,
      y: translateY.value
    });
    const previousTappedSquare = selectedSquare.value;
    const move = previousTappedSquare && validateMove(previousTappedSquare, currentSquare);

    if (move) {
      (0, _reactNativeReanimated.runOnJS)(globalMoveTo)(move);
      return;
    }

    if (!gestureEnabled.value) return;
    scale.value = (0, _reactNativeReanimated.withTiming)(1.2);
    onStartTap(square);
  }, [gestureEnabled.value, globalMoveTo, onStartTap, scale, selectedSquare.value, square, toPosition, translateX.value, translateY.value, validateMove]);

  const gesture = _reactNativeGestureHandler.Gesture.Pan().enabled(!isPromoting && pieceEnabled.value).onBegin(() => {
    offsetX.value = translateX.value;
    offsetY.value = translateY.value;
    (0, _reactNativeReanimated.runOnJS)(handleOnBegin)();
  }).onStart(() => {
    if (!gestureEnabled.value) return;
    isGestureActive.value = true;
  }).onUpdate(_ref3 => {
    let {
      translationX,
      translationY
    } = _ref3;
    if (!gestureEnabled.value) return;
    translateX.value = offsetX.value + translationX;
    translateY.value = offsetY.value + translationY;
  }).onEnd(() => {
    if (!gestureEnabled.value) return;
    (0, _reactNativeReanimated.runOnJS)(movePiece)(toPosition({
      x: translateX.value,
      y: translateY.value
    }));
  }).onFinalize(() => {
    scale.value = (0, _reactNativeReanimated.withTiming)(1);
  });

  const style = (0, _reactNativeReanimated.useAnimatedStyle)(() => {
    return {
      position: 'absolute',
      opacity: (0, _reactNativeReanimated.withTiming)(pieceEnabled.value ? 1 : 0),
      zIndex: isGestureActive.value ? 100 : 10,
      transform: [{
        translateX: translateX.value
      }, {
        translateY: translateY.value
      }, {
        scale: scale.value
      }]
    };
  });
  const underlay = (0, _reactNativeReanimated.useAnimatedStyle)(() => {
    const position = toPosition({
      x: translateX.value,
      y: translateY.value
    });
    const translation = toTranslation(position);
    return {
      position: 'absolute',
      width: size * 2,
      height: size * 2,
      borderRadius: size,
      zIndex: 0,
      backgroundColor: isGestureActive.value ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
      transform: [{
        translateX: translation.x - size / 2
      }, {
        translateY: translation.y - size / 2
      }]
    };
  }, [size]);
  return /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/_react.default.createElement(_reactNativeReanimated.default.View, {
    style: underlay
  }), /*#__PURE__*/_react.default.createElement(_reactNativeGestureHandler.GestureDetector, {
    gesture: gesture
  }, /*#__PURE__*/_react.default.createElement(_reactNativeReanimated.default.View, {
    style: style
  }, /*#__PURE__*/_react.default.createElement(_visualPiece.ChessPiece, {
    id: id
  }))));
}), (prev, next) => prev.id === next.id && prev.size === next.size && prev.square === next.square);

var _default = Piece;
exports.default = _default;
//# sourceMappingURL=index.js.map