import type { Square } from 'chess.js';
import React, {
  createContext,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  ChessboardState,
  getChessboardState,
} from '../../helpers/get-chessboard-state';
import type { ChessPieceRef } from '../../piece';
import type { HighlightedSquareRefType } from '../../components/highlighted-squares/highlighted-square';

import { useChessEngine } from '../chess-engine-context/hooks';
import { useSetBoard } from '../board-context/hooks';

const PieceRefsContext = createContext<React.MutableRefObject<Record<
  Square,
  React.MutableRefObject<ChessPieceRef>
> | null> | null>(null);

const SquareRefsContext = createContext<React.MutableRefObject<Record<
  Square,
  React.MutableRefObject<HighlightedSquareRefType>
> | null> | null>(null);

export type ChessboardRef = {
  move: (_: { from: Square; to: Square }) => void;
  highlight: (_: { square: Square; color?: string }) => void;
  resetAllHighlightedSquares: () => void;
  resetBoard: (fen?: string) => void;
  getState: () => ChessboardState;
};

const BoardRefsContextProviderComponent = React.forwardRef<
  ChessboardRef,
  { children?: React.ReactNode }
>(({ children }, ref) => {
  const chess = useChessEngine();
  const board = chess.board();
  const setBoard = useSetBoard();

  const generateBoardRefs = useCallback(() => {
    let acc = {};
    for (let x = 0; x < board.length; x++) {
      const row = board[x];
      for (let y = 0; y < row.length; y++) {
        const col = String.fromCharCode(97 + Math.round(x));
        // eslint-disable-next-line no-shadow
        const row = `${8 - Math.round(y)}`;
        const square = `${col}${row}` as Square;

        // eslint-disable-next-line react-hooks/rules-of-hooks
        acc = { ...acc, [square]: useRef(null) };
      }
    }
    return acc as any;
  }, [board]);

  const pieceRefs: React.MutableRefObject<Record<
    Square,
    React.MutableRefObject<ChessPieceRef>
  > | null> = useRef(generateBoardRefs());

  const squareRefs: React.MutableRefObject<Record<
    Square,
    React.MutableRefObject<HighlightedSquareRefType>
  > | null> = useRef(generateBoardRefs());

  useImperativeHandle(
    ref,
    () => ({
      move: ({ from, to }) => {
        pieceRefs?.current?.[from].current.moveTo(to);
      },
      highlight: ({ square, color }) => {
        squareRefs.current?.[square].current.highlight({
          backgroundColor: color,
        });
      },
      resetAllHighlightedSquares: () => {
        for (let x = 0; x < board.length; x++) {
          const row = board[x];
          for (let y = 0; y < row.length; y++) {
            const col = String.fromCharCode(97 + Math.round(x));
            // eslint-disable-next-line no-shadow
            const row = `${8 - Math.round(y)}`;
            const square = `${col}${row}` as Square;
            squareRefs.current?.[square].current.reset();
          }
        }
      },
      getState: () => {
        return getChessboardState(chess);
      },
      resetBoard: (fen) => {
        chess.reset();
        if (fen) chess.load(fen);
        setBoard(chess.board());
      },
    }),
    [board, chess, setBoard]
  );

  return (
    <PieceRefsContext.Provider value={pieceRefs}>
      <SquareRefsContext.Provider value={squareRefs}>
        {children}
      </SquareRefsContext.Provider>
    </PieceRefsContext.Provider>
  );
});

const BoardRefsContextProvider = React.memo(BoardRefsContextProviderComponent);

export { PieceRefsContext, SquareRefsContext, BoardRefsContextProvider };
