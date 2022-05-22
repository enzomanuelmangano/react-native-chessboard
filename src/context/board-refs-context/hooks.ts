import { useContext } from 'react';

import { BoardRefsContext } from './index';

export const useBoardRefs = () => {
  return useContext(BoardRefsContext);
};
