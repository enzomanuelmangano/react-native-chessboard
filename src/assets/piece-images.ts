import { useImage } from '@shopify/react-native-skia';

const SPRITE_SOURCE = require('./pieces-sprite.png');

export const usePieceSpriteSheet = () => {
  const image = useImage(SPRITE_SOURCE);
  return { image };
};
