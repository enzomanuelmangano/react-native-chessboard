import { useContext } from 'react';

import { PieceRefsContext, SquareRefsContext } from './index';

export const usePieceRefs = () => {
  return useContext(PieceRefsContext);
};

export const useSquareRefs = () => {
  return useContext(SquareRefsContext);
};
