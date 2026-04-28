import React, { useMemo, useCallback, useState, useRef, forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import type { PieceSymbol, Square } from 'chess.js';
import { useBoardContext, useBoardConfig, useBoardStateValues } from '../../state';
import { createMoveExecutor, MoveResult } from '../../state/move-executor';
import { useBoardGesture } from '../../hooks/use-board-gesture';
import { useChessboardRef, ChessboardRef } from '../../hooks/use-chessboard-ref';
import { usePieceSpriteSheet } from '../../assets/piece-images';
import { SkiaBoard } from './skia-board';
import { PromotionDialog } from '../promotion-dialog';

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
}

export const GestureBoard = forwardRef<ChessboardRef, GestureBoardProps>(
  ({ onMove }, ref) => {
    const { chess } = useBoardContext();
    const config = useBoardConfig();
    const boardState = useBoardStateValues();
    const { image: spriteImage } = usePieceSpriteSheet();

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

    const moveExecutor = useMemo(
      () =>
        createMoveExecutor(chess, boardState, config, {
          onMove,
          onPromotionRequired: handlePromotionRequired,
        }),
      [chess, boardState, config, onMove, handlePromotionRequired]
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
    });

    return (
      <GestureHandlerRootView
        style={[styles.container, { width: config.boardSize }]}
      >
        <GestureDetector gesture={gesture}>
          <View style={[styles.container, { width: config.boardSize }]}>
            <SkiaBoard
              config={config}
              boardState={boardState}
              spriteImage={spriteImage}
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
