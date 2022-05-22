import type { Square } from 'chess.js';
import React, { useCallback, useImperativeHandle } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useBoardOperations } from './context/board-operations-context/hooks';
import { useChessEngine } from './context/chess-engine-context/hooks';
import { toTranslation, SIZE, toPosition } from './notation';
import { PieceImage } from './piece-image';
import type { PieceType, Vector } from './types';

type PieceProps = {
  id: PieceType;
  startPosition: Vector;
  square: Square;
};

const Piece = React.memo(
  React.forwardRef<{ moveTo: (square: Square) => void }, PieceProps>(
    ({ id, startPosition, square }, ref) => {
      const chess = useChessEngine();
      const { onSelectPiece, onMove, selectedSquare } = useBoardOperations();

      const isGestureActive = useSharedValue(false);
      const offsetX = useSharedValue(0);
      const offsetY = useSharedValue(0);
      const scale = useSharedValue(1);

      const translateX = useSharedValue(startPosition.x * SIZE);
      const translateY = useSharedValue(startPosition.y * SIZE);

      const moveTo = useCallback(
        (from: Square, to: Square) => {
          const moves = chess.moves({ verbose: true });
          const move = moves.find((m) => m.from === from && m.to === to);
          const { x, y } = toTranslation(move ? move.to : from);

          translateX.value = withTiming(
            x,
            { duration: 150 },
            () => (offsetX.value = translateX.value)
          );
          translateY.value = withTiming(y, { duration: 150 }, (isFinished) => {
            if (!isFinished) return;
            offsetY.value = translateY.value;
            isGestureActive.value = false;
            runOnJS(onMove)(from, to);
          });
        },
        [
          chess,
          isGestureActive,
          offsetX,
          offsetY,
          onMove,
          translateX,
          translateY,
        ]
      );

      const movePiece = useCallback(
        (to: Square) => {
          const from = toPosition({ x: offsetX.value, y: offsetY.value });
          moveTo(from, to);
        },
        [moveTo, offsetX.value, offsetY.value]
      );

      useImperativeHandle(
        ref,
        () => {
          return {
            moveTo: (to: Square) => {
              moveTo(square, to);
            },
          };
        },
        [moveTo, square]
      );

      const onStartTap = useCallback(
        (square: Square) => {
          'worklet';
          if (!onSelectPiece) {
            return;
          }
          runOnJS(onSelectPiece)(square);
        },
        [onSelectPiece]
      );

      const gesture = Gesture.Pan()
        .onBegin(() => {
          offsetX.value = translateX.value;
          offsetY.value = translateY.value;
          scale.value = withTiming(1.5);
          const square = toPosition({
            x: translateX.value,
            y: translateY.value,
          });

          if (selectedSquare.value != null && selectedSquare.value !== square) {
            // console.log('moveTo');
          }
          onStartTap(square);
        })
        .onStart(() => {
          isGestureActive.value = true;
        })
        .onUpdate(({ translationX, translationY }) => {
          translateX.value = offsetX.value + translationX;
          translateY.value = offsetY.value + translationY;
        })
        .onEnd(() => {
          runOnJS(movePiece)(
            toPosition({ x: translateX.value, y: translateY.value })
          );
        })
        .onFinalize(() => {
          scale.value = withTiming(1);
        });

      const style = useAnimatedStyle(() => {
        return {
          position: 'absolute',
          zIndex: isGestureActive.value ? 100 : 10,
          transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
          ],
        };
      });

      const underlay = useAnimatedStyle(() => {
        const position = toPosition({
          x: translateX.value,
          y: translateY.value,
        });
        const translation = toTranslation(position);
        return {
          position: 'absolute',
          width: SIZE * 2,
          height: SIZE * 2,
          borderRadius: SIZE,
          zIndex: 0,
          backgroundColor: isGestureActive.value
            ? 'rgba(0, 0, 0, 0.1)'
            : 'transparent',
          transform: [
            { translateX: translation.x - SIZE / 2 },
            { translateY: translation.y - SIZE / 2 },
          ],
        };
      });

      return (
        <>
          <Animated.View style={underlay} />
          <GestureDetector gesture={gesture}>
            <Animated.View style={style}>
              <PieceImage id={id} />
            </Animated.View>
          </GestureDetector>
        </>
      );
    }
  ),
  (prev, next) => prev.id === next.id
);

export default Piece;
