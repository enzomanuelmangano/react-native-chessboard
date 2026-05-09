import type { ImageSourcePropType } from 'react-native';
import { useImage } from '@shopify/react-native-skia';

const DEFAULT_SPRITE_SOURCE = require('./pieces-sprite.png');

/**
 * Loads the piece sprite sheet.
 *
 * Default sheet layout (used when no custom source is provided):
 * - 6×2 grid, 128×128 cells
 * - Row 0: white pieces in order p, n, b, r, q, k
 * - Row 1: black pieces in same order
 *
 * Custom sheets must follow the same layout. Use the bundled
 * `react-native-chessboard-generate-sprite` script to compose
 * 12 individual PNGs into a compatible sheet.
 */
export const usePieceSpriteSheet = (source?: ImageSourcePropType) => {
  const image = useImage(source ?? DEFAULT_SPRITE_SOURCE);
  return { image };
};

const PIECE_SOURCES = {
  wp: require('./wp.png'),
  wn: require('./wn.png'),
  wb: require('./wb.png'),
  wr: require('./wr.png'),
  wq: require('./wq.png'),
  wk: require('./wk.png'),
  bp: require('./bp.png'),
  bn: require('./bn.png'),
  bb: require('./bb.png'),
  br: require('./br.png'),
  bq: require('./bq.png'),
  bk: require('./bk.png'),
} as const;

export { PIECE_SOURCES };
