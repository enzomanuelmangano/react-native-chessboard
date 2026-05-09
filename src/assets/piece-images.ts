import { useImage } from '@shopify/react-native-skia';

const SPRITE_SOURCE = require('./pieces-sprite.png');

export const usePieceSpriteSheet = () => {
  const image = useImage(SPRITE_SOURCE);
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
