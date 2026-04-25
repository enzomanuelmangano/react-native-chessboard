import { useImage } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import type { PieceType } from '../types';

// Piece image sources
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

export type PieceImages = Record<PieceType, SkImage | null>;

export const usePieceImages = (): PieceImages => {
  const wp = useImage(PIECE_SOURCES.wp);
  const wn = useImage(PIECE_SOURCES.wn);
  const wb = useImage(PIECE_SOURCES.wb);
  const wr = useImage(PIECE_SOURCES.wr);
  const wq = useImage(PIECE_SOURCES.wq);
  const wk = useImage(PIECE_SOURCES.wk);
  const bp = useImage(PIECE_SOURCES.bp);
  const bn = useImage(PIECE_SOURCES.bn);
  const bb = useImage(PIECE_SOURCES.bb);
  const br = useImage(PIECE_SOURCES.br);
  const bq = useImage(PIECE_SOURCES.bq);
  const bk = useImage(PIECE_SOURCES.bk);

  return useMemo(
    () => ({
      wp,
      wn,
      wb,
      wr,
      wq,
      wk,
      bp,
      bn,
      bb,
      br,
      bq,
      bk,
    }),
    [wp, wn, wb, wr, wq, wk, bp, bn, bb, br, bq, bk]
  );
};

export { PIECE_SOURCES };
