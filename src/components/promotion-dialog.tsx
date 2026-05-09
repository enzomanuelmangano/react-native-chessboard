import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import type { PieceSymbol } from 'chess.js';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { BoardConfig } from '../state';
import { PIECE_SOURCES } from '../assets/piece-images';

const PROMOTION_PIECES: PieceSymbol[] = ['q', 'r', 'b', 'n'];

interface PromotionDialogProps {
  color: 'w' | 'b';
  onSelect: (piece: PieceSymbol) => void;
  onCancel: () => void;
  config: BoardConfig;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  pieceButton: {
    padding: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  pieceImage: {
    width: 48,
    height: 48,
  },
});

export const PromotionDialog: React.FC<PromotionDialogProps> = React.memo(
  ({ color, onSelect, onCancel, config }) => {
    const { colors } = config;

    return (
      <Modal transparent visible animationType="fade">
        <Pressable style={styles.overlay} onPress={onCancel}>
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.container}
          >
            {PROMOTION_PIECES.map((piece) => {
              const pieceCode = `${color}${piece}` as keyof typeof PIECE_SOURCES;
              const source = PIECE_SOURCES[pieceCode];

              return (
                <TouchableOpacity
                  key={piece}
                  style={[
                    styles.pieceButton,
                    { backgroundColor: colors.promotionPieceButton },
                  ]}
                  onPress={() => onSelect(piece)}
                  activeOpacity={0.7}
                >
                  <Image source={source} style={styles.pieceImage} />
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </Pressable>
      </Modal>
    );
  }
);

PromotionDialog.displayName = 'PromotionDialog';
