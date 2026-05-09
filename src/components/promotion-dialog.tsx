import React, { useMemo } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  View,
} from 'react-native';
import type { PieceSymbol } from 'chess.js';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Atlas, Canvas, Skia, rect } from '@shopify/react-native-skia';
import type { SkImage, SkRect, SkRSXform } from '@shopify/react-native-skia';
import type { BoardConfig } from '../state';
import { usePieceSpriteSheet } from '../assets/piece-images';

const PROMOTION_PIECES: PieceSymbol[] = ['q', 'r', 'b', 'n'];
const SPRITE_CELL_SIZE = 128;
const PIECE_BUTTON_SIZE = 48;
const SPRITE_SCALE = PIECE_BUTTON_SIZE / SPRITE_CELL_SIZE;

const PIECE_COLUMN: Record<PieceSymbol, number> = {
  p: 0,
  n: 1,
  b: 2,
  r: 3,
  q: 4,
  k: 5,
};

const getPieceSpriteRect = (color: 'w' | 'b', piece: PieceSymbol): SkRect => {
  const col = PIECE_COLUMN[piece];
  const row = color === 'w' ? 0 : 1;
  return rect(
    col * SPRITE_CELL_SIZE,
    row * SPRITE_CELL_SIZE,
    SPRITE_CELL_SIZE,
    SPRITE_CELL_SIZE
  );
};

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
  pieceCanvas: {
    width: PIECE_BUTTON_SIZE,
    height: PIECE_BUTTON_SIZE,
  },
});

interface PieceSpriteProps {
  image: SkImage | null;
  color: 'w' | 'b';
  piece: PieceSymbol;
}

const SPRITE_TRANSFORM: SkRSXform[] = [Skia.RSXform(SPRITE_SCALE, 0, 0, 0)];

const PieceSprite: React.FC<PieceSpriteProps> = React.memo(
  ({ image, color, piece }) => {
    const sprites = useMemo(
      () => [getPieceSpriteRect(color, piece)],
      [color, piece]
    );

    return (
      <Canvas style={styles.pieceCanvas}>
        <Atlas image={image} sprites={sprites} transforms={SPRITE_TRANSFORM} />
      </Canvas>
    );
  }
);

PieceSprite.displayName = 'PieceSprite';

export const PromotionDialog: React.FC<PromotionDialogProps> = React.memo(
  ({ color, onSelect, onCancel, config }) => {
    const { colors } = config;
    const { image: spriteImage } = usePieceSpriteSheet();

    const buttonStyle = useMemo(
      () => [
        styles.pieceButton,
        { backgroundColor: colors.promotionPieceButton },
      ],
      [colors.promotionPieceButton]
    );

    return (
      <Modal transparent visible animationType="fade">
        <Pressable style={styles.overlay} onPress={onCancel}>
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.container}
          >
            {PROMOTION_PIECES.map((piece) => (
              <TouchableOpacity
                key={piece}
                style={buttonStyle}
                onPress={() => onSelect(piece)}
                activeOpacity={0.7}
              >
                <View style={styles.pieceCanvas}>
                  <PieceSprite
                    image={spriteImage}
                    color={color}
                    piece={piece}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>
    );
  }
);

PromotionDialog.displayName = 'PromotionDialog';
