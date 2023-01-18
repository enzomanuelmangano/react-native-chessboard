import React from 'react';
import type { ChessboardRef } from './context/board-refs-context';
import { ChessboardProps, DEFAULT_BOARD_SIZE } from './context/props-context';
declare const ChessboardContainer: React.MemoExoticComponent<React.ForwardRefExoticComponent<ChessboardProps & React.RefAttributes<ChessboardRef>>>;
export { DEFAULT_BOARD_SIZE };
export type { ChessboardRef };
export default ChessboardContainer;
