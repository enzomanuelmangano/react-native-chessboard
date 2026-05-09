import { useRef, useMemo, useEffect } from 'react';
import {
  useSharedValue,
  makeMutable,
  withSpring,
} from 'react-native-reanimated';
import { Chess } from 'chess.js';
import type { Square, Color } from 'chess.js';
import type {
  BoardState,
  PieceCode,
  SquareState,
  HighlightState,
} from './types';
import { SQUARES } from './types';
import { MOVE_SPRING } from '../config/animations';

const squareToIndex = (
  square: Square,
  flipped: boolean = false
): { row: number; col: number } => {
  'worklet';
  let col = square.charCodeAt(0) - 'a'.charCodeAt(0);
  let row = 8 - parseInt(square[1], 10);

  if (flipped) {
    col = 7 - col;
    row = 7 - row;
  }

  return { row, col };
};

export const squareToPosition = (
  square: Square,
  pieceSize: number,
  flipped: boolean = false
): { x: number; y: number } => {
  'worklet';
  const { row, col } = squareToIndex(square, flipped);
  return { x: col * pieceSize, y: row * pieceSize };
};

export const positionToSquare = (
  x: number,
  y: number,
  pieceSize: number,
  flipped: boolean = false
): Square => {
  'worklet';
  let col = Math.floor(x / pieceSize);
  let row = Math.floor(y / pieceSize);

  if (flipped) {
    col = 7 - col;
    row = 7 - row;
  }

  const colChar = String.fromCharCode('a'.charCodeAt(0) + col);
  const rowNum = 8 - row;
  return `${colChar}${rowNum}` as Square;
};

const getPieceCodeFromBoard = (chess: Chess, square: Square): PieceCode => {
  const piece = chess.get(square);
  if (!piece) return null;
  return `${piece.color}${piece.type}` as PieceCode;
};

const createSquareStates = (
  chess: Chess,
  pieceSize: number,
  flipped: boolean = false
): Record<Square, SquareState> => {
  const states: Partial<Record<Square, SquareState>> = {};

  for (const square of SQUARES) {
    const piece = getPieceCodeFromBoard(chess, square);
    const pos = squareToPosition(square, pieceSize, flipped);

    states[square] = {
      piece: makeMutable<PieceCode>(piece),
      translateX: makeMutable(pos.x),
      translateY: makeMutable(pos.y),
      scale: makeMutable(1),
      zIndex: makeMutable(0),
    };
  }

  return states as Record<Square, SquareState>;
};

const createHighlightStates = (): Record<Square, HighlightState> => {
  const states: Partial<Record<Square, HighlightState>> = {};

  for (const square of SQUARES) {
    states[square] = {
      color: makeMutable<string | null>(null),
    };
  }

  return states as Record<Square, HighlightState>;
};

export const useBoardState = (
  initialFen: string | undefined,
  pieceSize: number,
  flipped: boolean = false
): { boardState: BoardState; chess: Chess } => {
  const chessRef = useRef<Chess | null>(null);

  if (!chessRef.current) {
    chessRef.current = new Chess(initialFen);
  }

  const chess = chessRef.current;

  // Create states once and store in ref
  const statesRef = useRef<{
    squares: Record<Square, SquareState>;
    highlights: Record<Square, HighlightState>;
  } | null>(null);

  if (!statesRef.current) {
    statesRef.current = {
      squares: createSquareStates(chess, pieceSize, flipped),
      highlights: createHighlightStates(),
    };
  }

  const { squares: squareStates, highlights: highlightStates } =
    statesRef.current;

  // Board-level shared values
  const turn = useSharedValue<Color>(chess.turn());
  const selectedSquare = useSharedValue<Square | null>(null);
  const validMoves = useSharedValue<Square[]>([]);
  const lastMove = useSharedValue<{ from: Square; to: Square } | null>(null);
  const isCheck = useSharedValue(chess.isCheck());
  const kingInCheckSquare = useSharedValue<Square | null>(null);

  // squareStates were created once with the *initial* flipped value, so toggling
  // `flipped` at runtime would otherwise leave un-moved pieces stuck at their
  // original positions. When flipped (or pieceSize) changes, slide every
  // occupied square to its new logical position.
  const isFirstLayoutRef = useRef(true);
  useEffect(() => {
    if (isFirstLayoutRef.current) {
      isFirstLayoutRef.current = false;
      return;
    }
    for (const square of SQUARES) {
      const state = squareStates[square];
      if (state.piece.get() === null) continue;
      const pos = squareToPosition(square, pieceSize, flipped);
      state.translateX.set(withSpring(pos.x, MOVE_SPRING));
      state.translateY.set(withSpring(pos.y, MOVE_SPRING));
    }
  }, [flipped, pieceSize, squareStates]);

  // The Chess instance and SharedValues were initialised once on mount, so
  // changing the `fen` prop after mount would otherwise be silently dropped.
  // When the prop changes to a new value, rebuild chess state (in place via
  // chess.load so the ref identity stays stable for downstream consumers),
  // snap every square to the new piece + position without animation, and
  // clear board-level state (selection, valid moves, last move, check state,
  // highlights). Programmatic moves still go through ref.current.move.
  const isFirstFenRef = useRef(true);
  useEffect(() => {
    if (isFirstFenRef.current) {
      isFirstFenRef.current = false;
      return;
    }
    if (!initialFen) {
      chess.reset();
    } else {
      chess.load(initialFen);
    }
    for (const square of SQUARES) {
      const state = squareStates[square];
      const piece = getPieceCodeFromBoard(chess, square);
      const pos = squareToPosition(square, pieceSize, flipped);
      state.piece.set(piece);
      state.translateX.set(pos.x);
      state.translateY.set(pos.y);
      state.scale.set(1);
      state.zIndex.set(0);
      highlightStates[square].color.set(null);
    }
    turn.set(chess.turn());
    selectedSquare.set(null);
    validMoves.set([]);
    lastMove.set(null);
    isCheck.set(chess.isCheck());
    kingInCheckSquare.set(null);
  }, [
    initialFen,
    chess,
    pieceSize,
    flipped,
    squareStates,
    highlightStates,
    turn,
    selectedSquare,
    validMoves,
    lastMove,
    isCheck,
    kingInCheckSquare,
  ]);

  const boardState = useMemo(
    (): BoardState => ({
      squares: squareStates,
      highlights: highlightStates,
      turn,
      selectedSquare,
      validMoves,
      lastMove,
      isCheck,
      kingInCheckSquare,
    }),
    [
      squareStates,
      highlightStates,
      turn,
      selectedSquare,
      validMoves,
      lastMove,
      isCheck,
      kingInCheckSquare,
    ]
  );

  return { boardState, chess };
};
