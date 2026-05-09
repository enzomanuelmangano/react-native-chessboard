import React, {
  useMemo,
  useCallback,
  useState,
  forwardRef,
  useRef,
} from 'react';
import { View, StyleSheet } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import type { PieceSymbol, Square } from 'chess.js';
import {
  useBoardContext,
  useBoardConfig,
  useBoardStateValues,
} from '../../state';
import { createMoveExecutor, MoveResult } from '../../state/move-executor';
import { squareToPosition } from '../../state/use-board-state';
import { useBoardGesture } from '../../hooks/use-board-gesture';
import {
  useChessboardRef,
  ChessboardRef,
} from '../../hooks/use-chessboard-ref';
import { usePieceSpriteSheet } from '../../assets/piece-images';
import { findKingSquare } from '../../helpers/find-king-square';
import { SkiaBoard } from './skia-board';
import { PromotionDialog } from '../promotion-dialog';
import type { EffectParams, EffectTrigger } from '../../types';

const styles = StyleSheet.create({
  container: {
    aspectRatio: 1,
  },
});

interface PromotionInfo {
  from: Square;
  to: Square;
  color: 'w' | 'b';
  complete: (piece: PieceSymbol) => void;
}

export interface GestureBoardProps {
  onMove?: (result: MoveResult) => void;
  onIllegalMove?: (from: Square, to: Square) => void;
  renderEffect?: (params: EffectParams) => React.ReactNode;
}

export const GestureBoard = forwardRef<ChessboardRef, GestureBoardProps>(
  ({ onMove, onIllegalMove, renderEffect }, ref) => {
    const { chess } = useBoardContext();
    const config = useBoardConfig();
    const boardState = useBoardStateValues();
    const { image: spriteImage } = usePieceSpriteSheet();

    // Effect state for shader effects (all SharedValues for reactivity)
    const effectCenterX = useSharedValue(0);
    const effectCenterY = useSharedValue(0);
    const effectProgress = useSharedValue(0);
    const effectTrigger = useSharedValue<
      'checkmate' | 'check' | 'stalemate' | ''
    >('');

    // Use ref to store promotion info to avoid re-renders during drag
    // Only the boolean state triggers a render when dialog needs to show/hide
    const promotionInfoRef = useRef<PromotionInfo | null>(null);
    const [showPromotion, setShowPromotion] = useState(false);

    const handlePromotionRequired = useCallback((info: PromotionInfo) => {
      promotionInfoRef.current = info;
      setShowPromotion(true);
    }, []);

    const handlePromotionSelect = useCallback((piece: PieceSymbol) => {
      const info = promotionInfoRef.current;
      if (info) {
        info.complete(piece);
        promotionInfoRef.current = null;
        setShowPromotion(false);
      }
    }, []);

    const handlePromotionCancel = useCallback(() => {
      promotionInfoRef.current = null;
      setShowPromotion(false);
    }, []);

    // Trigger effect on game events
    const triggerEffect = useCallback(
      (trigger: EffectTrigger, kingColor: 'w' | 'b') => {
        if (!renderEffect) return;

        const kingSquare = findKingSquare(chess, kingColor);
        if (!kingSquare) return;

        const pos = squareToPosition(
          kingSquare,
          config.pieceSize,
          config.flipped
        );
        effectCenterX.value = pos.x + config.pieceSize / 2;
        effectCenterY.value = pos.y + config.pieceSize / 2;
        effectTrigger.value = trigger || '';
        effectProgress.value = 0;
        effectProgress.value = withTiming(1, { duration: 2000 });
      },
      [
        renderEffect,
        chess,
        config.pieceSize,
        config.flipped,
        effectCenterX,
        effectCenterY,
        effectTrigger,
        effectProgress,
      ]
    );

    // Wrapped onMove to trigger effects
    const handleMove = useCallback(
      (result: MoveResult) => {
        // Trigger effects based on game state
        if (result.state.isCheckmate) {
          // The losing king (current turn after move) gets the effect
          triggerEffect('checkmate', chess.turn());
        } else if (result.state.isStalemate) {
          triggerEffect('stalemate', chess.turn());
        } else if (result.state.isCheck) {
          triggerEffect('check', chess.turn());
        }

        // Call user's onMove callback
        onMove?.(result);
      },
      [onMove, triggerEffect, chess]
    );

    const moveExecutor = useMemo(
      () =>
        createMoveExecutor(chess, boardState, config, {
          onMove: handleMove,
          onPromotionRequired: handlePromotionRequired,
        }),
      [chess, boardState, config, handleMove, handlePromotionRequired]
    );

    // Setup ref API
    useChessboardRef({
      ref,
      chess,
      boardState,
      moveExecutor,
      defaultHighlightColor: config.colors.lastMoveHighlight,
    });

    const gesture = useBoardGesture({
      boardState,
      config,
      moveExecutor,
      gestureEnabled: config.gestureEnabled,
      onIllegalMove,
    });

    const containerStyle = useMemo(
      () => [styles.container, { width: config.boardSize }],
      [config.boardSize]
    );

    const effectParams = useMemo<EffectParams>(
      () => ({
        centerX: effectCenterX,
        centerY: effectCenterY,
        progress: effectProgress,
        boardSize: config.boardSize,
        trigger: effectTrigger,
      }),
      [
        effectCenterX,
        effectCenterY,
        effectProgress,
        effectTrigger,
        config.boardSize,
      ]
    );

    return (
      <GestureHandlerRootView style={containerStyle}>
        <GestureDetector gesture={gesture}>
          <View style={containerStyle}>
            <SkiaBoard
              config={config}
              boardState={boardState}
              spriteImage={spriteImage}
              renderEffect={renderEffect}
              effectParams={effectParams}
            />
          </View>
        </GestureDetector>
        {showPromotion && promotionInfoRef.current && (
          <PromotionDialog
            color={promotionInfoRef.current.color}
            onSelect={handlePromotionSelect}
            onCancel={handlePromotionCancel}
            config={config}
          />
        )}
      </GestureHandlerRootView>
    );
  }
);

GestureBoard.displayName = 'GestureBoard';
