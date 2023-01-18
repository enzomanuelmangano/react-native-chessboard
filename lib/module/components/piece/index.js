import React, { useCallback, useImperativeHandle } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { useChessboardProps } from '../../context/props-context/hooks';
import { useBoardOperations } from '../../context/board-operations-context/hooks';
import { useBoardPromotion } from '../../context/board-promotion-context/hooks';
import { usePieceRefs } from '../../context/board-refs-context/hooks';
import { useChessEngine } from '../../context/chess-engine-context/hooks';
import { useReversePiecePosition } from '../../notation';
import { ChessPiece } from './visual-piece';
const Piece = /*#__PURE__*/React.memo( /*#__PURE__*/React.forwardRef((_ref, ref) => {
  let {
    id,
    startPosition,
    square,
    size
  } = _ref;
  const chess = useChessEngine();
  const refs = usePieceRefs();
  const pieceEnabled = useSharedValue(true);
  const {
    isPromoting
  } = useBoardPromotion();
  const {
    onSelectPiece,
    onMove,
    selectedSquare,
    turn
  } = useBoardOperations();
  const {
    durations: {
      move: moveDuration
    },
    gestureEnabled: gestureEnabledFromChessboardProps
  } = useChessboardProps();
  const gestureEnabled = useDerivedValue(() => turn.value === id.charAt(0) && gestureEnabledFromChessboardProps, [id, gestureEnabledFromChessboardProps]);
  const {
    toPosition,
    toTranslation
  } = useReversePiecePosition();
  const isGestureActive = useSharedValue(false);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(startPosition.x * size);
  const translateY = useSharedValue(startPosition.y * size);
  const validateMove = useCallback((from, to) => {
    return chess.moves({
      verbose: true
    }).find(m => m.from === from && m.to === to);
  }, [chess]);
  const wrappedOnMoveForJSThread = useCallback(_ref2 => {
    let {
      move
    } = _ref2;
    onMove(move.from, move.to);
  }, [onMove]);
  const moveTo = useCallback((from, to) => {
    return new Promise(resolve => {
      const move = validateMove(from, to);
      const {
        x,
        y
      } = toTranslation(move ? move.to : from);
      translateX.value = withTiming(x, {
        duration: moveDuration
      }, () => {
        offsetX.value = translateX.value;
      });
      translateY.value = withTiming(y, {
        duration: moveDuration
      }, isFinished => {
        if (!isFinished) return;
        offsetY.value = translateY.value;
        isGestureActive.value = false;

        if (move) {
          runOnJS(wrappedOnMoveForJSThread)({
            move
          }); // Ideally I must call the resolve method
          // inside the "wrappedOnMoveForJSThread" after
          // the "onMove" function.
          // Unfortunately I'm not able to pass a
          // function in the RunOnJS params

          runOnJS(resolve)(move);
        } else {
          runOnJS(resolve)(undefined);
        }
      });
    });
  }, [isGestureActive, moveDuration, offsetX, offsetY, toTranslation, translateX, translateY, validateMove, wrappedOnMoveForJSThread]);
  const movePiece = useCallback(to => {
    const from = toPosition({
      x: offsetX.value,
      y: offsetY.value
    });
    moveTo(from, to);
  }, [moveTo, offsetX.value, offsetY.value, toPosition]);
  useImperativeHandle(ref, () => {
    return {
      moveTo: to => {
        return moveTo(square, to);
      },
      enable: active => {
        pieceEnabled.value = active;
      }
    };
  }, [moveTo, pieceEnabled, square]);
  const onStartTap = useCallback( // eslint-disable-next-line no-shadow
  square => {
    'worklet';

    if (!onSelectPiece) {
      return;
    }

    runOnJS(onSelectPiece)(square);
  }, [onSelectPiece]);
  const globalMoveTo = useCallback(move => {
    var _refs$current, _refs$current$move$fr, _refs$current$move$fr2;

    refs === null || refs === void 0 ? void 0 : (_refs$current = refs.current) === null || _refs$current === void 0 ? void 0 : (_refs$current$move$fr = (_refs$current$move$fr2 = _refs$current[move.from].current).moveTo) === null || _refs$current$move$fr === void 0 ? void 0 : _refs$current$move$fr.call(_refs$current$move$fr2, move.to);
  }, [refs]);
  const handleOnBegin = useCallback(() => {
    const currentSquare = toPosition({
      x: translateX.value,
      y: translateY.value
    });
    const previousTappedSquare = selectedSquare.value;
    const move = previousTappedSquare && validateMove(previousTappedSquare, currentSquare);

    if (move) {
      runOnJS(globalMoveTo)(move);
      return;
    }

    if (!gestureEnabled.value) return;
    scale.value = withTiming(1.2);
    onStartTap(square);
  }, [gestureEnabled.value, globalMoveTo, onStartTap, scale, selectedSquare.value, square, toPosition, translateX.value, translateY.value, validateMove]);
  const gesture = Gesture.Pan().enabled(!isPromoting && pieceEnabled.value).onBegin(() => {
    offsetX.value = translateX.value;
    offsetY.value = translateY.value;
    runOnJS(handleOnBegin)();
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
    runOnJS(movePiece)(toPosition({
      x: translateX.value,
      y: translateY.value
    }));
  }).onFinalize(() => {
    scale.value = withTiming(1);
  });
  const style = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      opacity: withTiming(pieceEnabled.value ? 1 : 0),
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
  const underlay = useAnimatedStyle(() => {
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
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Animated.View, {
    style: underlay
  }), /*#__PURE__*/React.createElement(GestureDetector, {
    gesture: gesture
  }, /*#__PURE__*/React.createElement(Animated.View, {
    style: style
  }, /*#__PURE__*/React.createElement(ChessPiece, {
    id: id
  }))));
}), (prev, next) => prev.id === next.id && prev.size === next.size && prev.square === next.square);
export default Piece;
//# sourceMappingURL=index.js.map