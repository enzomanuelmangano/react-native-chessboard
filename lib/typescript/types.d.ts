/// <reference types="node" />
/// <reference types="react-native" />
import type { ChessInstance, Square } from 'chess.js';
declare type Player = ReturnType<ChessInstance['turn']>;
declare type Type = 'q' | 'r' | 'n' | 'b' | 'k' | 'p';
declare type PieceType = `${Player}${Type}`;
declare type PiecesType = Record<PieceType, ReturnType<typeof require>>;
declare type Vector<T = number> = {
    x: T;
    y: T;
};
declare type ChessMove = {
    from: Square;
    to: Square;
};
declare type MoveType = {
    from: Square;
    to: Square;
};
export type { Player, Type, PieceType, PiecesType, Vector, ChessMove, MoveType, };
