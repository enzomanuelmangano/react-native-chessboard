import React, { useMemo } from 'react';
import { Dimensions } from 'react-native';

type ChessboardProps = {
  fen?: string;
  withLetters?: boolean;
  withNumbers?: boolean;
  colors?: {
    white: string;
    black: string;
  };
  boardSize?: number;
};

type ChessboardContextType = ChessboardProps &
  Required<
    Pick<
      ChessboardProps,
      'colors' | 'withLetters' | 'withNumbers' | 'boardSize'
    >
  > & { pieceSize: number };

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const defaultChessboardProps: ChessboardContextType = {
  colors: {
    black: '#62B1A8',
    white: '#D9FDF8',
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
      const data = { ...defaultChessboardProps, ...rest };
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
