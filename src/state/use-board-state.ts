import { useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import { useSharedValue, makeMutable } from 'react-native-reanimated';
import { runOnUISync } from 'react-native-worklets';
import { Chess } from 'chess.js';
import type { Square, Color } from 'chess.js';
import type {
  BoardState,
  PieceCode,
  SquareState,
  HighlightState,
} from './types';
import { SQUARES } from './types';
import type { LegalTargets } from './types';
import { collectLegalTargets } from '../helpers/collect-legal-targets';

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
      lastMove: makeMutable(false),
      inCheck: makeMutable(false),
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
  // Seeded from the initial position; the executor refreshes it after every
  // move, and the fen effect below after every prop-driven reset.
  const legalTargets = useSharedValue<LegalTargets>(
    collectLegalTargets(chessRef.current)
  );

  // Latest layout, read by the fen-reset effect WITHOUT subscribing to it.
  // The fen effect resets the board to `initialFen`; layout changes (flip /
  // resize) must NOT trigger that reset (they'd wipe a live game) — they are
  // handled by the layout effect below. Reading via a ref keeps `pieceSize`
  // and `flipped` out of the fen effect's dependencies.
  const layoutRef = useRef({ pieceSize, flipped });
  layoutRef.current = { pieceSize, flipped };

  // squareStates were created once with the *initial* flipped value, so toggling
  // `flipped` at runtime would otherwise leave un-moved pieces stuck at their
  // original positions. A flip/resize is an orientation/scale change, not a
  // move, so snap every occupied square to its new logical position instantly
  // — springing them would make all pieces fly across the board at once.
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
      state.translateX.set(pos.x);
      state.translateY.set(pos.y);
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
  // `useLayoutEffect`, not `useEffect`: the reset must land before the browser
  // /host paints the commit that carried the new `fen`, otherwise one frame
  // shows the new position's props against the old board.
  useLayoutEffect(() => {
    if (isFirstFenRef.current) {
      isFirstFenRef.current = false;
      return;
    }
    if (!initialFen) {
      chess.reset();
    } else {
      try {
        chess.load(initialFen);
      } catch {
        // Invalid `fen` prop — keep the current position rather than crashing
        // the effect (mirrors resetBoard's defensive load).
        return;
      }
    }
    const { pieceSize: ps, flipped: fl } = layoutRef.current;
    const pieces = SQUARES.map((square) =>
      getPieceCodeFromBoard(chess, square)
    );
    const positions = SQUARES.map((square) => squareToPosition(square, ps, fl));
    const nextTurn = chess.turn();
    const nextIsCheck = chess.isCheck();
    // The position just changed under the board, so the cached legality map
    // belongs to the old one.
    legalTargets.set(collectLegalTargets(chess));

    // Commit every square in a single UI-runtime transaction. Setting each
    // field from JS schedules hundreds of independent updates, and Skia is
    // free to draw between any two of them — during rapid FEN swaps that
    // surfaces as frames holding half the old position and half the new one.
    runOnUISync(
      (nextPieces, nextPositions, nextTurnValue, nextCheckValue) => {
        'worklet';
        for (let index = 0; index < SQUARES.length; index += 1) {
          const square = SQUARES[index];
          const state = squareStates[square];
          const position = nextPositions[index];
          state.piece.set(nextPieces[index]);
          state.translateX.set(position.x);
          state.translateY.set(position.y);
          state.scale.set(1);
          state.zIndex.set(0);
          state.lastMove.set(false);
          state.inCheck.set(false);
          highlightStates[square].color.set(null);
        }
        turn.set(nextTurnValue);
        selectedSquare.set(null);
        validMoves.set([]);
        lastMove.set(null);
        isCheck.set(nextCheckValue);
        kingInCheckSquare.set(null);
      },
      pieces,
      positions,
      nextTurn,
      nextIsCheck
    );
  }, [
    // `initialFen` is the ONLY legitimate reset trigger. `pieceSize`/`flipped`
    // are read from layoutRef so flips/resizes don't reload the position.
    initialFen,
    chess,
    squareStates,
    highlightStates,
    turn,
    selectedSquare,
    validMoves,
    lastMove,
    isCheck,
    kingInCheckSquare,
    legalTargets,
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
      legalTargets,
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
      legalTargets,
    ]
  );

  return { boardState, chess };
};
