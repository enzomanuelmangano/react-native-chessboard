import React, { useEffect } from 'react';
import { Atlas, Group, rect, Skia } from '@shopify/react-native-skia';
import type { SkRect, SkRSXform, SkImage } from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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
  bn: rect(
    SPRITE_CELL_SIZE,
    SPRITE_CELL_SIZE,
    SPRITE_CELL_SIZE,
    SPRITE_CELL_SIZE
  ),
  bb: rect(
    SPRITE_CELL_SIZE * 2,
    SPRITE_CELL_SIZE,
    SPRITE_CELL_SIZE,
    SPRITE_CELL_SIZE
  ),
  br: rect(
    SPRITE_CELL_SIZE * 3,
    SPRITE_CELL_SIZE,
    SPRITE_CELL_SIZE,
    SPRITE_CELL_SIZE
  ),
  bq: rect(
    SPRITE_CELL_SIZE * 4,
    SPRITE_CELL_SIZE,
    SPRITE_CELL_SIZE,
    SPRITE_CELL_SIZE
  ),
  bk: rect(
    SPRITE_CELL_SIZE * 5,
    SPRITE_CELL_SIZE,
    SPRITE_CELL_SIZE,
    SPRITE_CELL_SIZE
  ),
};

/**
 * Which pieces this atlas draws.
 *
 * `resting` — everything sitting on its square. Drawn UNDER the move dots, so
 * a dot on an occupied square (i.e. a capture target) stays visible.
 * `raised` — whatever a drag or an in-flight move has lifted (`zIndex > 0`).
 * Drawn OVER the dots, so the piece under the finger is never occluded by
 * them.
 */
export type PieceLayer = 'resting' | 'raised';

interface SkiaPiecesAtlasProps {
  spriteImage: SkImage | null;
  boardState: BoardState;
  pieceSize: number;
  layer: PieceLayer;
}

/**
 * Renders chess pieces using a single Atlas draw call per layer.
 *
 * Benefits:
 * - Single draw call for all pieces in the layer (vs 64+ individual draws)
 * - zIndex handled by array order (last = on top)
 * - Transforms calculated in worklet (no JS thread overhead)
 */
export const SkiaPiecesAtlas: React.FC<SkiaPiecesAtlasProps> = React.memo(
  ({ spriteImage, boardState, pieceSize, layer }) => {
    // Scale factor from sprite sheet cell size to piece size
    const scale = pieceSize / SPRITE_CELL_SIZE;

    // When the sheet decodes asynchronously the pieces would otherwise hard-pop
    // onto an already-visible checkerboard — fade them in instead. A cached
    // sheet is there on the first render, so it starts fully opaque and no
    // fade is ever seen.
    const piecesOpacity = useSharedValue(spriteImage ? 1 : 0);
    useEffect(() => {
      if (spriteImage) {
        piecesOpacity.value = withTiming(1, { duration: 180 });
      }
    }, [spriteImage, piecesOpacity]);

    // Build sprites + transforms in a single UI-thread pass over the board.
    // Two projection derived values pull from this so we don't iterate the
    // 64 squares twice per frame.
    const atlasData = useDerivedValue(() => {
      const sprites: SkRect[] = [];
      const transforms: SkRSXform[] = [];
      const pieces: Array<{
        square: Square;
        piece: NonNullable<PieceCode>;
        zIndex: number;
      }> = [];

      for (const square of SQUARES) {
        const squareState = boardState.squares[square];
        const piece = squareState.piece.get();
        if (!piece) continue;

        // `zIndex > 0` is exactly "lifted by a drag or an in-flight move",
        // which is the one case that must draw above the dots.
        const zIndex = squareState.zIndex.get();
        const isRaised = zIndex > 0;
        if (isRaised !== (layer === 'raised')) continue;

        pieces.push({ square, piece, zIndex });
      }

      // zIndex ascending — higher draws last (on top).
      pieces.sort((a, b) => a.zIndex - b.zIndex);

      for (const { square, piece } of pieces) {
        sprites.push(SPRITE_RECTS[piece]);

        const squareState = boardState.squares[square];
        const x = squareState.translateX.get();
        const y = squareState.translateY.get();
        const pieceScale = squareState.scale.get() * scale;

        // RSXform scales from (0,0); shift so the sprite's centre lands on
        // the square's centre.
        const centerX = x + pieceSize / 2;
        const centerY = y + pieceSize / 2;
        const scaledHalf = (SPRITE_CELL_SIZE / 2) * pieceScale;
        transforms.push(
          Skia.RSXform(
            pieceScale,
            0,
            centerX - scaledHalf,
            centerY - scaledHalf
          )
        );
      }

      return { sprites, transforms };
    });

    const sprites = useDerivedValue(() => atlasData.value.sprites);
    const transforms = useDerivedValue(() => atlasData.value.transforms);

    if (!spriteImage) {
      return null;
    }

    return (
      <Group opacity={piecesOpacity}>
        <Atlas image={spriteImage} sprites={sprites} transforms={transforms} />
      </Group>
    );
  }
);

SkiaPiecesAtlas.displayName = 'SkiaPiecesAtlas';
