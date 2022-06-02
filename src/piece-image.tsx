import React from 'react';
import { Image, ImageProps } from 'react-native';

import { PIECES } from './constants';
import { useChessboardProps } from './context/props-context/hooks';

import type { PieceType } from './types';

type PieceImageType = {
  id: PieceType;
} & Partial<ImageProps>;

const PieceImage: React.FC<PieceImageType> = React.memo(({ id, ...rest }) => {
  const { pieceSize } = useChessboardProps();
  return (
    <Image
      style={[{ width: pieceSize, height: pieceSize }, rest.style]}
      {...rest}
      source={PIECES[id]}
    />
  );
});

export { PieceImage };
