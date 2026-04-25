import type { Chess, Square, Color, PieceSymbol } from 'chess.js';

type Player = Color;
type Type = PieceSymbol;
type PieceType = `${Player}${Type}`;

type PiecesType = Record<PieceType, ReturnType<typeof require>>;
type Vector<T = number> = {
  x: T;
  y: T;
};

type ChessMove = {
  from: Square;
  to: Square;
};

type MoveType = { from: Square; to: Square };

export type {
  Chess,
  Player,
  Type,
  PieceType,
  PiecesType,
  Vector,
  ChessMove,
  MoveType,
  Square,
  Color,
  PieceSymbol,
};
