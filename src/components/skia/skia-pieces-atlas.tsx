import React from 'react';
import { Atlas, rect, Skia } from '@shopify/react-native-skia';
import type { SkRect, SkRSXform, SkImage } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { Square } from 'chess.js';
import { SQUARES, BoardState, PieceCode } from '../../state/types';

// Sprite sheet layout: 6x2 grid (p, n, b, r, q, k for each color)
// Row 0: white pieces, Row 1: black pieces
const SPRITE_CELL_SIZE = 128;

// Pre-computed sprite rects for all piece types
const SPRITE_RECTS: Record<NonNullable<PieceCode>, SkRect> = {
  wp: rect(0, 0, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE),
  wn: rect(SPRITE_CELL_SIZE, 0, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE),
  wb: rect(SPRITE_CELL_SIZE * 2, 0, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE),
  wr: rect(SPRITE_CELL_SIZE * 3, 0, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE),
  wq: rect(SPRITE_CELL_SIZE * 4, 0, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE),
  wk: rect(SPRITE_CELL_SIZE * 5, 0, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE),
  bp: rect(0, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE),
  bn: rect(SPRITE_CELL_SIZE, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE),
  bb: rect(SPRITE_CELL_SIZE * 2, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE),
  br: rect(SPRITE_CELL_SIZE * 3, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE),
  bq: rect(SPRITE_CELL_SIZE * 4, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE),
  bk: rect(SPRITE_CELL_SIZE * 5, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE),
};

interface SkiaPiecesAtlasProps {
  spriteImage: SkImage | null;
  boardState: BoardState;
  pieceSize: number;
}

/**
 * Renders all chess pieces using a single Atlas draw call.
 *
 * Benefits:
 * - Single draw call for all pieces (vs 64+ individual draws)
 * - zIndex handled by array order (last = on top)
 * - Transforms calculated in worklet (no JS thread overhead)
 */
export const SkiaPiecesAtlas: React.FC<SkiaPiecesAtlasProps> = React.memo(
  ({ spriteImage, boardState, pieceSize }) => {
    // Scale factor from sprite sheet cell size to piece size
    const scale = pieceSize / SPRITE_CELL_SIZE;

    // Build sprites and transforms dynamically based on board state
    // This runs on UI thread via worklet
    const sprites = useDerivedValue(() => {
      const result: SkRect[] = [];

      // Collect pieces with their zIndex for sorting
      const pieces: Array<{ square: Square; piece: NonNullable<PieceCode>; zIndex: number }> = [];

      for (const square of SQUARES) {
        const squareState = boardState.squares[square];
        const piece = squareState.piece.get();
        if (piece) {
          pieces.push({
            square,
            piece,
            zIndex: squareState.zIndex.get(),
          });
        }
      }

      // Sort by zIndex - higher zIndex drawn last (on top)
      pieces.sort((a, b) => a.zIndex - b.zIndex);

      // Build sprite rects array
      for (const { piece } of pieces) {
        result.push(SPRITE_RECTS[piece]);
      }

      return result;
    });

    const transforms = useDerivedValue(() => {
      const result: SkRSXform[] = [];

      // Collect pieces with their zIndex for sorting (same logic as sprites)
      const pieces: Array<{ square: Square; zIndex: number }> = [];

      for (const square of SQUARES) {
        const squareState = boardState.squares[square];
        const piece = squareState.piece.get();
        if (piece) {
          pieces.push({
            square,
            zIndex: squareState.zIndex.get(),
          });
        }
      }

      // Sort by zIndex - must match sprites order
      pieces.sort((a, b) => a.zIndex - b.zIndex);

      // Build transforms array
      for (const { square } of pieces) {
        const squareState = boardState.squares[square];
        const x = squareState.translateX.get();
        const y = squareState.translateY.get();
        const pieceScale = squareState.scale.get() * scale;

        // RSXform: scos, ssin, tx, ty
        // For scale only (no rotation): scos = scale, ssin = 0
        // The transform is applied around (0,0), so we need to account for scaling
        // tx and ty are the translation after scaling
        //
        // To scale around center:
        // 1. We want the CENTER of the piece to be at (x + pieceSize/2, y + pieceSize/2)
        // 2. RSXform scales the sprite from its top-left corner
        // 3. After scaling, the sprite's center offset is (SPRITE_CELL_SIZE/2 * pieceScale)
        // 4. So tx = centerX - scaledHalfWidth, ty = centerY - scaledHalfHeight
        const centerX = x + pieceSize / 2;
        const centerY = y + pieceSize / 2;
        const scaledHalf = (SPRITE_CELL_SIZE / 2) * pieceScale;

        result.push(Skia.RSXform(pieceScale, 0, centerX - scaledHalf, centerY - scaledHalf));
      }

      return result;
    });

    if (!spriteImage) {
      return null;
    }

    return (
      <Atlas
        image={spriteImage}
        sprites={sprites}
        transforms={transforms}
      />
    );
  }
);

SkiaPiecesAtlas.displayName = 'SkiaPiecesAtlas';
