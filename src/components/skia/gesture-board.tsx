import React, { useMemo, useCallback, useState, forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import type { PieceSymbol, Square } from 'chess.js';
import { useBoardContext, useBoardConfig, useBoardStateValues } from '../../state';
import { createMoveExecutor, MoveResult } from '../../state/move-executor';
import { useBoardGesture } from '../../hooks/use-board-gesture';
import { useChessboardRef, ChessboardRef } from '../../hooks/use-chessboard-ref';
import { usePieceImages } from '../../assets/piece-images';
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
    console.log('[DEBUG] GestureBoard render start');
    const { chess } = useBoardContext();
    console.log('[DEBUG] got chess');
    const config = useBoardConfig();
    console.log('[DEBUG] got config');
    const boardState = useBoardStateValues();
    console.log('[DEBUG] got boardState');
    const pieceImages = usePieceImages();
    console.log('[DEBUG] got pieceImages');
    const [promotionInfo, setPromotionInfo] = useState<PromotionInfo | null>(
      null
    );

    const handlePromotionRequired = useCallback((info: PromotionInfo) => {
      setPromotionInfo(info);
    }, []);

    const handlePromotionSelect = useCallback(
      (piece: PieceSymbol) => {
        if (promotionInfo) {
          promotionInfo.complete(piece);
          setPromotionInfo(null);
        }
      },
      [promotionInfo]
    );

    const handlePromotionCancel = useCallback(() => {
      setPromotionInfo(null);
    }, []);

    console.log('[DEBUG] before moveExecutor');
    const moveExecutor = useMemo(
      () =>
        createMoveExecutor(chess, boardState, config, {
          onMove,
          onPromotionRequired: handlePromotionRequired,
        }),
      [chess, boardState, config, onMove, handlePromotionRequired]
    );
    console.log('[DEBUG] after moveExecutor');

    // Setup ref API
    console.log('[DEBUG] before useChessboardRef');
    useChessboardRef({
      ref,
      chess,
      boardState,
      moveExecutor,
      defaultHighlightColor: config.colors.lastMoveHighlight,
    });
    console.log('[DEBUG] after useChessboardRef');

    console.log('[DEBUG] before useBoardGesture');
    const gesture = useBoardGesture({
      boardState,
      config,
      moveExecutor,
      gestureEnabled: config.gestureEnabled,
    });
    console.log('[DEBUG] after useBoardGesture');

    return (
      <GestureHandlerRootView
        style={[styles.container, { width: config.boardSize }]}
      >
        <GestureDetector gesture={gesture}>
          <View style={[styles.container, { width: config.boardSize }]}>
            <SkiaBoard
              config={config}
              boardState={boardState}
              pieceImages={pieceImages}
            />
          </View>
        </GestureDetector>
        {promotionInfo && (
          <PromotionDialog
            color={promotionInfo.color}
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
