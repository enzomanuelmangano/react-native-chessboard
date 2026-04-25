import { useMemo, useRef } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { Chess } from 'chess.js';
import type { Square, Color } from 'chess.js';
import type { BoardState, PieceCode, SquareState, HighlightState } from './types';
import { SQUARES } from './types';

const squareToIndex = (square: Square): { row: number; col: number } => {
  'worklet';
  const col = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = 8 - parseInt(square[1], 10);
  return { row, col };
};

export const squareToPosition = (
  square: Square,
  pieceSize: number
): { x: number; y: number } => {
  'worklet';
  const { row, col } = squareToIndex(square);
  return { x: col * pieceSize, y: row * pieceSize };
};

export const positionToSquare = (
  x: number,
  y: number,
  pieceSize: number
): Square => {
  'worklet';
  const col = Math.floor(x / pieceSize);
  const row = Math.floor(y / pieceSize);
  const colChar = String.fromCharCode('a'.charCodeAt(0) + col);
  const rowNum = 8 - row;
  return `${colChar}${rowNum}` as Square;
};

const getPieceCodeFromBoard = (
  chess: Chess,
  square: Square
): PieceCode => {
  const piece = chess.get(square);
  if (!piece) return null;
  return `${piece.color}${piece.type}` as PieceCode;
};

export const useBoardState = (
  initialFen: string | undefined,
  pieceSize: number
): { boardState: BoardState; chess: Chess } => {
  const chessRef = useRef<Chess>(new Chess(initialFen));
  const chess = chessRef.current;

  // Create shared values for each square - these are created once and never recreated
  const squareStates = useMemo(() => {
    const states: Partial<Record<Square, SquareState>> = {};

    for (const square of SQUARES) {
      const piece = getPieceCodeFromBoard(chess, square);
      const pos = squareToPosition(square, pieceSize);

      states[square] = {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        piece: useSharedValue<PieceCode>(piece),
        // eslint-disable-next-line react-hooks/rules-of-hooks
        translateX: useSharedValue(pos.x),
        // eslint-disable-next-line react-hooks/rules-of-hooks
        translateY: useSharedValue(pos.y),
        // eslint-disable-next-line react-hooks/rules-of-hooks
        scale: useSharedValue(1),
        // eslint-disable-next-line react-hooks/rules-of-hooks
        zIndex: useSharedValue(0),
      };
    }

    return states as Record<Square, SquareState>;
    // We intentionally only run this once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create highlight states for each square
  const highlightStates = useMemo(() => {
    const states: Partial<Record<Square, HighlightState>> = {};

    for (const square of SQUARES) {
      states[square] = {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        color: useSharedValue<string | null>(null),
      };
    }

    return states as Record<Square, HighlightState>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Board-level shared values
  const turn = useSharedValue<Color>(chess.turn());
  const selectedSquare = useSharedValue<Square | null>(null);
  const validMoves = useSharedValue<Square[]>([]);
  const lastMove = useSharedValue<{ from: Square; to: Square } | null>(null);
  const isCheck = useSharedValue(chess.isCheck());
  const kingInCheckSquare = useSharedValue<Square | null>(null);

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
