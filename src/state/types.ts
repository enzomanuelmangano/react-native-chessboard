import type { ImageSourcePropType } from 'react-native';
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
  // Per-square highlight flags. Writers (move-executor / reset paths) flip
  // only the affected squares, so each square's highlight worklet subscribes
  // to its own flag instead of all 64 pulling from a shared global.
  lastMove: SharedValue<boolean>;
  inCheck: SharedValue<boolean>;
}

export interface HighlightState {
  color: SharedValue<string | null>;
}

/** Legal destinations for the side to move, keyed by origin square. */
export type LegalTargets = Partial<Record<Square, Square[]>>;

export interface BoardState {
  squares: Record<Square, SquareState>;
  highlights: Record<Square, HighlightState>;
  turn: SharedValue<Color>;
  selectedSquare: SharedValue<Square | null>;
  /**
   * Targets of the CURRENTLY SELECTED piece — what the dots draw. Written from
   * the JS thread by `selectPiece`, so it lags a gesture by a round trip and
   * must never be used to judge a drop. See `legalTargets`.
   */
  validMoves: SharedValue<Square[]>;
  /**
   * Every legal move in the position, by origin square. Refreshed whenever the
   * position changes, so the gesture handler can validate a drop entirely on
   * the UI thread — without waiting for `selectPiece` to round-trip through
   * JS, which is what let fast drags be judged against a stale selection.
   */
  legalTargets: SharedValue<LegalTargets>;
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
  animations: {
    move: WithSpringConfig;
    scale: WithSpringConfig;
    snapBack: WithSpringConfig;
  };
  fontSource: ImageSourcePropType | null;
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
