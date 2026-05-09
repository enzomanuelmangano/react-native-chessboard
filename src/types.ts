import type { Chess, Square, Color, PieceSymbol } from 'chess.js';
import type { SharedValue } from 'react-native-reanimated';

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

type EffectTrigger = 'checkmate' | 'check' | 'stalemate' | '';

interface EffectParams {
  // Center position of the effect (e.g., king position on checkmate)
  centerX: SharedValue<number>;
  centerY: SharedValue<number>;
  // Progress from 0 to 1, animated when effect triggers
  progress: SharedValue<number>;
  // Board dimensions
  boardSize: number;
  // What triggered the effect (SharedValue for reactivity)
  trigger: SharedValue<EffectTrigger>;
}

export type {
  Chess,
  Player,
  Type,
  PieceType,
  PiecesType,
  Vector,
  ChessMove,
  Square,
  Color,
  PieceSymbol,
  EffectParams,
  EffectTrigger,
};
