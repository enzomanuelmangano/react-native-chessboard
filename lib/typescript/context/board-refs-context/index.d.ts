import type { Move, Square } from 'chess.js';
import React from 'react';
import { ChessboardState } from '../../helpers/get-chessboard-state';
import type { ChessPieceRef } from '../../components/piece';
import type { HighlightedSquareRefType } from '../../components/highlighted-squares/highlighted-square';
declare const PieceRefsContext: React.Context<React.MutableRefObject<Record<Square, React.MutableRefObject<ChessPieceRef>> | null> | null>;
declare const SquareRefsContext: React.Context<React.MutableRefObject<Record<Square, React.MutableRefObject<HighlightedSquareRefType>> | null> | null>;
export declare type ChessboardRef = {
    move: (_: {
        from: Square;
        to: Square;
    }) => Promise<Move | undefined> | undefined;
    highlight: (_: {
        square: Square;
        color?: string;
    }) => void;
    resetAllHighlightedSquares: () => void;
    resetBoard: (fen?: string) => void;
    getState: () => ChessboardState;
};
declare const BoardRefsContextProvider: React.MemoExoticComponent<React.ForwardRefExoticComponent<{
    children?: React.ReactNode;
} & React.RefAttributes<ChessboardRef>>>;
export { PieceRefsContext, SquareRefsContext, BoardRefsContextProvider };
