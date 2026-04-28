import React, { createContext, useContext, useMemo } from 'react';
import { Chess } from 'chess.js';
import type { BoardState, BoardConfig } from './types';
import { useBoardState } from './use-board-state';
import { Dimensions } from 'react-native';
import { MOVE_SPRING, SCALE_SPRING, SNAP_BACK_SPRING } from '../config/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_BOARD_SIZE = Math.floor(SCREEN_WIDTH / 8) * 8;

type BoardContextValue = {
  boardState: BoardState;
  chess: Chess;
  config: BoardConfig;
};

const BoardStateContext = createContext<BoardContextValue | null>(null);

export type BoardStateProviderProps = {
  children: React.ReactNode;
  fen?: string;
  boardSize?: number;
  gestureEnabled?: boolean;
  withLetters?: boolean;
  withNumbers?: boolean;
  colors?: Partial<BoardConfig['colors']>;
  durations?: Partial<BoardConfig['durations']>;
};

const defaultColors: BoardConfig['colors'] = {
  white: '#D9FDF8',
  black: '#62B1A8',
  lastMoveHighlight: 'rgba(255,255,0, 0.5)',
  checkmateHighlight: '#E84855',
  promotionPieceButton: '#FF9B71',
};

const defaultDurations: BoardConfig['durations'] = {
  move: 150,
};

const defaultAnimations: BoardConfig['animations'] = {
  move: MOVE_SPRING,
  scale: SCALE_SPRING,
  snapBack: SNAP_BACK_SPRING,
};

export const BoardStateProvider: React.FC<BoardStateProviderProps> = ({
  children,
  fen,
  boardSize = DEFAULT_BOARD_SIZE,
  gestureEnabled = true,
  withLetters = true,
  withNumbers = true,
  colors,
  durations,
}) => {
  const pieceSize = boardSize / 8;

  const config = useMemo(
    (): BoardConfig => ({
      boardSize,
      pieceSize,
      gestureEnabled,
      withLetters,
      withNumbers,
      colors: { ...defaultColors, ...colors },
      durations: { ...defaultDurations, ...durations },
      animations: defaultAnimations,
    }),
    [boardSize, pieceSize, gestureEnabled, withLetters, withNumbers, colors, durations]
  );

  const { boardState, chess } = useBoardState(fen, pieceSize);

  const value = useMemo(
    () => ({
      boardState,
      chess,
      config,
    }),
    [boardState, chess, config]
  );

  return (
    <BoardStateContext.Provider value={value}>
      {children}
    </BoardStateContext.Provider>
  );
};

export const useBoardContext = (): BoardContextValue => {
  const context = useContext(BoardStateContext);
  if (!context) {
    throw new Error('useBoardContext must be used within a BoardStateProvider');
  }
  return context;
};

export const useBoardConfig = (): BoardConfig => {
  return useBoardContext().config;
};

export const useChess = (): Chess => {
  return useBoardContext().chess;
};

export const useBoardStateValues = (): BoardState => {
  return useBoardContext().boardState;
};
