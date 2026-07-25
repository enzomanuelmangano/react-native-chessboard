import { useEffect } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image as RNImage } from 'react-native';
import { Skia, useImage } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';

const DEFAULT_SPRITE_SOURCE = require('./pieces-sprite.png');

// Decoded sprite sheets, keyed by resolved asset URI. Held for the lifetime of
// the app so every board after the first — or after a preload — draws its
// pieces on the first frame instead of waiting on an async decode.
const spriteCache = new Map<string, SkImage>();

const resolveSpriteUri = (source: ImageSourcePropType): string | null => {
  if (typeof source === 'number') {
    return RNImage.resolveAssetSource(source)?.uri ?? null;
  }
  if (typeof source === 'string') {
    return source;
  }
  if (source && !Array.isArray(source) && typeof source.uri === 'string') {
    return source.uri;
  }
  return null;
};

/**
 * Decodes a sprite sheet ahead of time so boards mounted later can draw their
 * pieces on the very first frame.
 *
 * Call once at app startup — typically alongside font loading, before the
 * first board is shown. Without it the first board of a session paints an
 * empty checkerboard for a frame or two while the sheet decodes.
 *
 * Resolves to the decoded image, or `null` if the source cannot be resolved
 * or decoded. Safe to call repeatedly: subsequent calls hit the cache.
 */
export const preloadPieceSpriteSheet = async (
  source?: ImageSourcePropType
): Promise<SkImage | null> => {
  const resolved = source ?? DEFAULT_SPRITE_SOURCE;
  const uri = resolveSpriteUri(resolved);
  if (!uri) return null;

  const cached = spriteCache.get(uri);
  if (cached) return cached;

  const data = await Skia.Data.fromURI(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (image) spriteCache.set(uri, image);
  return image;
};

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
 *
 * `wasCached` reports whether the sheet was available synchronously on the
 * very first render, which is what lets the atlas decide between painting the
 * pieces immediately and fading them in.
 */
export const usePieceSpriteSheet = (source?: ImageSourcePropType) => {
  const resolved = source ?? DEFAULT_SPRITE_SOURCE;
  const uri = resolveSpriteUri(resolved);
  const cached = uri ? spriteCache.get(uri) ?? null : null;

  // Skip the async decode entirely when the sheet is already cached.
  const loaded = useImage(cached ? null : resolved);

  useEffect(() => {
    if (!cached && loaded && uri) {
      spriteCache.set(uri, loaded);
    }
  }, [cached, loaded, uri]);

  const image = cached ?? loaded;
  return { image, wasCached: cached !== null };
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
