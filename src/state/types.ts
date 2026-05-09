import type { SharedValue, WithSpringConfig } from 'react-native-reanimated';
import type { Square, Color } from 'chess.js';

export type PieceCode =
  | 'wp'
  | 'wn'
  | 'wb'
  | 'wr'
  | 'wq'
  | 'wk'
  | 'bp'
  | 'bn'
  | 'bb'
  | 'br'
  | 'bq'
  | 'bk'
  | null;

export interface SquareState {
  piece: SharedValue<PieceCode>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  zIndex: SharedValue<number>;
}

export interface HighlightState {
  color: SharedValue<string | null>;
}

export interface BoardState {
  squares: Record<Square, SquareState>;
  highlights: Record<Square, HighlightState>;
  turn: SharedValue<Color>;
  selectedSquare: SharedValue<Square | null>;
  validMoves: SharedValue<Square[]>;
  lastMove: SharedValue<{ from: Square; to: Square } | null>;
  isCheck: SharedValue<boolean>;
  kingInCheckSquare: SharedValue<Square | null>;
}

export interface BoardConfig {
  boardSize: number;
  pieceSize: number;
  gestureEnabled: boolean;
  flipped: boolean;
  withLetters: boolean;
  withNumbers: boolean;
  colors: {
    white: string;
    black: string;
    lastMoveHighlight: string;
    checkmateHighlight: string;
    promotionPieceButton: string;
  };
  durations: {
    move: number;
  };
  animations: {
    move: WithSpringConfig;
    scale: WithSpringConfig;
    snapBack: WithSpringConfig;
  };
}

// All 64 squares on a chessboard
export const SQUARES: Square[] = [
  'a8',
  'b8',
  'c8',
  'd8',
  'e8',
  'f8',
  'g8',
  'h8',
  'a7',
  'b7',
  'c7',
  'd7',
  'e7',
  'f7',
  'g7',
  'h7',
  'a6',
  'b6',
  'c6',
  'd6',
  'e6',
  'f6',
  'g6',
  'h6',
  'a5',
  'b5',
  'c5',
  'd5',
  'e5',
  'f5',
  'g5',
  'h5',
  'a4',
  'b4',
  'c4',
  'd4',
  'e4',
  'f4',
  'g4',
  'h4',
  'a3',
  'b3',
  'c3',
  'd3',
  'e3',
  'f3',
  'g3',
  'h3',
  'a2',
  'b2',
  'c2',
  'd2',
  'e2',
  'f2',
  'g2',
  'h2',
  'a1',
  'b1',
  'c1',
  'd1',
  'e1',
  'f1',
  'g1',
  'h1',
];
