import React from 'react';
import { Image, ImageProps } from 'react-native';

import { PIECES } from './constants';
import { SIZE } from './notation';
import type { PieceType } from './types';

type PieceImageType = {
  id: PieceType;
} & Partial<ImageProps>;

const PieceImage: React.FC<PieceImageType> = React.memo(({ id, ...rest }) => {
  return (
    <Image
      style={[{ width: SIZE, height: SIZE }, rest.style]}
      {...rest}
      source={PIECES[id]}
    />
  );
});

export { PieceImage };
