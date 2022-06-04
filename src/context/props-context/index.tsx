import type { Move } from 'chess.js';
import React, { useMemo } from 'react';
import { Dimensions } from 'react-native';
import type { PieceType } from '../../types';

import type { ChessboardState } from '../../helpers/get-chessboard-state';

type ChessMoveInfo = {
  move: Move;
  state: ChessboardState & { in_promotion: boolean };
};

type ChessboardColorsType = {
  white: string;
  black: string;
  lastMoveHighlight?: string;
  checkmateHighlight?: string;
  promotionPieceButton?: string;
};

type ChessboardDurationsType = {
  move?: number;
};

type ChessboardProps = {
  gestureEnabled?: boolean;
  fen?: string;
  withLetters?: boolean;
  withNumbers?: boolean;
  boardSize?: number;
  renderPiece?: (piece: PieceType) => React.ReactElement | null;
  onMove?: (info: ChessMoveInfo) => void;
  colors?: ChessboardColorsType;
  durations?: ChessboardDurationsType;
};

type ChessboardContextType = ChessboardProps &
  Required<
    Pick<
      ChessboardProps,
      'gestureEnabled' | 'withLetters' | 'withNumbers' | 'boardSize'
    >
  > & { pieceSize: number } & {
    colors: Required<ChessboardColorsType>;
    durations: Required<ChessboardDurationsType>;
  };

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const defaultChessboardProps: ChessboardContextType = {
  gestureEnabled: true,
  colors: {
    black: '#62B1A8',
    white: '#D9FDF8',
    lastMoveHighlight: 'rgba(255,255,0, 0.5)',
    checkmateHighlight: '#E84855',
    promotionPieceButton: '#FF9B71',
  },
  durations: {
    move: 150,
  },
  withLetters: true,
  withNumbers: true,
  boardSize: SCREEN_WIDTH,
  pieceSize: SCREEN_WIDTH / 8,
};

const ChessboardPropsContext = React.createContext<ChessboardContextType>(
  defaultChessboardProps
);

const ChessboardPropsContextProvider: React.FC<ChessboardProps> = React.memo(
  ({ children, ...rest }) => {
    const value = useMemo(() => {
      const data = {
        ...defaultChessboardProps,
        ...rest,
        colors: { ...defaultChessboardProps.colors, ...rest.colors },
        durations: { ...defaultChessboardProps.durations, ...rest.durations },
      };
      return { ...data, pieceSize: data.boardSize / 8 };
    }, [rest]);

    return (
      <ChessboardPropsContext.Provider value={value}>
        {children}
      </ChessboardPropsContext.Provider>
    );
  }
);

export { ChessboardPropsContextProvider, ChessboardPropsContext };
// eslint-disable-next-line no-undef
export type { ChessboardProps };
