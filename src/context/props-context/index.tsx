import type { Move } from 'chess.js';
import React, { useMemo } from 'react';
import { Dimensions } from 'react-native';
import type { PieceType } from 'src/types';
import type { ChessInstance } from 'chess.js';

type ChessboardStateFunctions = Pick<
  ChessInstance,
  | 'in_check'
  | 'in_checkmate'
  | 'in_draw'
  | 'in_stalemate'
  | 'in_threefold_repetition'
  | 'insufficient_material'
>;

type RecordReturnTypes<T> = {
  readonly [P in keyof T]: T[P] extends () => any ? ReturnType<T[P]> : T[P];
};

type ChessboardState = RecordReturnTypes<ChessboardStateFunctions> & {
  in_promotion: boolean;
};

type ChessMoveInfo = {
  move: Move;
  state: ChessboardState;
};

type ChessboardProps = {
  fen?: string;
  withLetters?: boolean;
  withNumbers?: boolean;
  colors?: {
    white: string;
    black: string;
    squareHighlight?: string;
  };
  boardSize?: number;
  renderPiece?: (piece: PieceType) => React.ReactElement | null;
  onMove?: (info: ChessMoveInfo) => void;
};

type ChessboardContextType = ChessboardProps &
  Required<
    Pick<
      ChessboardProps,
      'colors' | 'withLetters' | 'withNumbers' | 'boardSize'
    >
  > & { pieceSize: number };

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DEFAULT_HIGHLIGHTED_COLOR = 'rgba(255,255,0, 0.5)';

const defaultChessboardProps: ChessboardContextType = {
  colors: {
    black: '#62B1A8',
    white: '#D9FDF8',
    squareHighlight: DEFAULT_HIGHLIGHTED_COLOR,
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
