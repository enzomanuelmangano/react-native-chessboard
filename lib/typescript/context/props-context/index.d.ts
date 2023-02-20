import type { Move } from 'chess.js';
import React from 'react';
import type { PieceType } from '../../types';
import type { ChessboardState } from '../../helpers/get-chessboard-state';
declare type ChessMoveInfo = {
    move: Move;
    state: ChessboardState & {
        in_promotion: boolean;
    };
};
declare type ChessboardColorsType = {
    white: string;
    black: string;
    lastMoveHighlight?: string;
    checkmateHighlight?: string;
    promotionPieceButton?: string;
};
declare type ChessboardDurationsType = {
    move?: number;
};
declare type ChessboardProps = {
    /**
     * Enables gestures for chess pieces.
     */
    gestureEnabled?: boolean;
    /**
     * Indicates the initial fen position of the chessboard.
     */
    fen?: string;
    /**
     * Decides whether or not to show the letters on the bottom horizontal axis of the chessboard.
     */
    withLetters?: boolean;
    /**
     * Decides whether or not to show the letters on the bottom horizontal axis of the chessboard.
     */
    withNumbers?: boolean;
    /**
     * Indicates the chessboard width and height.
     */
    boardSize?: number;
    /**
     *
     * It gives the possibility to customise the chessboard pieces.
     *
     * In detail, it takes a PieceType as input, which is constructed as follows:
     */
    renderPiece?: (piece: PieceType) => React.ReactElement | null;
    /**
     * It's a particularly useful callback if you want to execute an instruction after a move.
     */
    onMove?: (info: ChessMoveInfo) => void;
    /**
     * Useful if you want to customise the default colors used in the chessboard.
     */
    colors?: ChessboardColorsType;
    /**
     * Useful if you want to customise the default durations used in the chessboard (in milliseconds).
     */
    durations?: ChessboardDurationsType;
};
declare type ChessboardContextType = ChessboardProps & Required<Pick<ChessboardProps, 'gestureEnabled' | 'withLetters' | 'withNumbers' | 'boardSize'>> & {
    pieceSize: number;
} & {
    colors: Required<ChessboardColorsType>;
    durations: Required<ChessboardDurationsType>;
};
declare const DEFAULT_BOARD_SIZE: number;
declare const ChessboardPropsContext: React.Context<ChessboardContextType>;
declare const ChessboardPropsContextProvider: React.FC<ChessboardProps>;
export { ChessboardPropsContextProvider, ChessboardPropsContext, DEFAULT_BOARD_SIZE, };
export type { ChessboardProps };
