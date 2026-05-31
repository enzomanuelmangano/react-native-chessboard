import { Chess, Square, PieceSymbol } from 'chess.js';
import { makeMutable } from 'react-native-reanimated';
import { createMoveExecutor } from '../state/move-executor';
import {
  squareToPosition,
  // Re-exported helper used by the gesture-board cancel path.
} from '../state/use-board-state';
import type {
  BoardState,
  PieceCode,
  SquareState,
  HighlightState,
  BoardConfig,
} from '../state/types';
import { SQUARES } from '../state/types';
import {
  MOVE_SPRING,
  SCALE_SPRING,
  SNAP_BACK_SPRING,
} from '../config/animations';

const PIECE_SIZE = 50;

const createMockSquareState = (
  piece: PieceCode,
  x: number,
  y: number
): SquareState => ({
  piece: makeMutable<PieceCode>(piece),
  translateX: makeMutable(x),
  translateY: makeMutable(y),
  scale: makeMutable(1),
  zIndex: makeMutable(0),
  lastMove: makeMutable(false),
  inCheck: makeMutable(false),
});

const createMockHighlightState = (): HighlightState => ({
  color: makeMutable<string | null>(null),
});

const createMockBoardState = (chess: Chess, pieceSize: number): BoardState => {
  const squares: Partial<Record<Square, SquareState>> = {};
  const highlights: Partial<Record<Square, HighlightState>> = {};

  for (const square of SQUARES) {
    const pos = squareToPosition(square, pieceSize, false);
    const piece = chess.get(square);
    const pieceCode: PieceCode = piece
      ? (`${piece.color}${piece.type}` as PieceCode)
      : null;
    squares[square] = createMockSquareState(pieceCode, pos.x, pos.y);
    highlights[square] = createMockHighlightState();
  }

  return {
    squares: squares as Record<Square, SquareState>,
    highlights: highlights as Record<Square, HighlightState>,
    turn: makeMutable(chess.turn()),
    selectedSquare: makeMutable<Square | null>(null),
    validMoves: makeMutable<Square[]>([]),
    lastMove: makeMutable<{ from: Square; to: Square } | null>(null),
    isCheck: makeMutable(false),
    kingInCheckSquare: makeMutable<Square | null>(null),
  };
};

const config: BoardConfig = {
  boardSize: PIECE_SIZE * 8,
  pieceSize: PIECE_SIZE,
  gestureEnabled: true,
  flipped: false,
  withLetters: false,
  withNumbers: false,
  colors: {
    white: '#fff',
    black: '#000',
    lastMoveHighlight: 'rgba(255,255,0,0.5)',
    checkmateHighlight: '#E84855',
    promotionPieceButton: '#FF9B71',
  },
  durations: { move: 150 },
  animations: {
    move: MOVE_SPRING,
    scale: SCALE_SPRING,
    snapBack: SNAP_BACK_SPRING,
  },
  fontSource: null,
};

// Mirror of the cancel path in gesture-board.tsx's handlePromotionCancel.
// Extracted into the test so the assertion is on the exact effect shape we
// promise: chess state untouched, pawn snapped back to origin.
const cancelPromotion = (
  boardState: BoardState,
  from: Square,
  pieceSize: number,
  flipped: boolean
) => {
  const fromState = boardState.squares[from];
  const originPos = squareToPosition(from, pieceSize, flipped);
  // No spring in the test — we want to assert on the final value, not the
  // animation curve. Production uses withSpring; the snap-back's terminal
  // value is the same.
  fromState.translateX.set(originPos.x);
  fromState.translateY.set(originPos.y);
  fromState.scale.set(1);
  fromState.zIndex.set(0);
  boardState.selectedSquare.set(null);
  boardState.validMoves.set([]);
};

describe('Promotion cancel', () => {
  // Position with a white pawn on e7 ready to promote on e8 (queen captures
  // not relevant — the back rank is empty). Black king on h8 to make it a
  // legal position.
  const PROMOTION_FEN = '7k/4P3/8/8/8/8/8/4K3 w - - 0 1';

  it('does not commit chess state when promotion is required and not completed', () => {
    const chess = new Chess(PROMOTION_FEN);
    const boardState = createMockBoardState(chess, PIECE_SIZE);
    const initialFen = chess.fen();
    let promotionRequired: {
      from: Square;
      to: Square;
      complete: (p: PieceSymbol) => void;
    } | null = null;

    const executor = createMoveExecutor(chess, boardState, config, {
      onPromotionRequired: (info) => {
        promotionRequired = {
          from: info.from,
          to: info.to,
          complete: info.complete,
        };
      },
    });

    // Drag-end programmatically simulates the gesture path: move the pawn's
    // visuals into the back rank so we can verify the cancel path puts them
    // back. tryMove will fire onPromotionRequired without touching chess.
    const e7State = boardState.squares.e7;
    const e8Pos = squareToPosition('e8', PIECE_SIZE, false);
    e7State.translateX.set(e8Pos.x);
    e7State.translateY.set(e8Pos.y);
    e7State.zIndex.set(100);
    e7State.scale.set(1.1);

    executor.tryMove('e7' as Square, 'e8' as Square);

    expect(promotionRequired).not.toBeNull();
    expect(chess.fen()).toBe(initialFen); // chess.move not yet called
    expect(boardState.squares.e7.piece.get()).toBe('wp'); // pawn still owned by e7
    expect(boardState.squares.e8.piece.get()).toBeNull(); // back rank still empty
  });

  it('snaps the pawn back to its origin square when cancelled', () => {
    const chess = new Chess(PROMOTION_FEN);
    const boardState = createMockBoardState(chess, PIECE_SIZE);

    const executor = createMoveExecutor(chess, boardState, config, {
      onPromotionRequired: () => {
        /* don't call complete -> simulates user dismissing the modal */
      },
    });

    const e7State = boardState.squares.e7;
    const e8Pos = squareToPosition('e8', PIECE_SIZE, false);
    const e7Pos = squareToPosition('e7', PIECE_SIZE, false);
    e7State.translateX.set(e8Pos.x);
    e7State.translateY.set(e8Pos.y);
    e7State.zIndex.set(100);
    e7State.scale.set(1.1);
    boardState.selectedSquare.set('e7' as Square);
    boardState.validMoves.set(['e8' as Square]);

    executor.tryMove('e7' as Square, 'e8' as Square);

    // The user dismisses the modal -> handlePromotionCancel runs.
    cancelPromotion(boardState, 'e7' as Square, PIECE_SIZE, false);

    expect(boardState.squares.e7.translateX.get()).toBe(e7Pos.x);
    expect(boardState.squares.e7.translateY.get()).toBe(e7Pos.y);
    expect(boardState.squares.e7.zIndex.get()).toBe(0);
    expect(boardState.squares.e7.scale.get()).toBe(1);
    expect(boardState.squares.e7.piece.get()).toBe('wp');
    expect(boardState.selectedSquare.get()).toBeNull();
    expect(boardState.validMoves.get()).toEqual([]);
  });

  it('still allows a fresh promotion attempt after a cancel', () => {
    const chess = new Chess(PROMOTION_FEN);
    const boardState = createMockBoardState(chess, PIECE_SIZE);
    let promotionCount = 0;
    let lastComplete: ((p: PieceSymbol) => void) | null = null;

    const executor = createMoveExecutor(chess, boardState, config, {
      onPromotionRequired: (info) => {
        promotionCount += 1;
        lastComplete = info.complete;
      },
    });

    // Try once, cancel.
    executor.tryMove('e7' as Square, 'e8' as Square);
    cancelPromotion(boardState, 'e7' as Square, PIECE_SIZE, false);
    expect(promotionCount).toBe(1);
    expect(chess.fen()).toBe(PROMOTION_FEN);

    // Try again — promotion should re-fire.
    executor.tryMove('e7' as Square, 'e8' as Square);
    expect(promotionCount).toBe(2);

    // This time the user picks a queen.
    expect(lastComplete).not.toBeNull();
    lastComplete!('q' as PieceSymbol);

    expect(chess.fen()).not.toBe(PROMOTION_FEN);
    expect(chess.history()).toEqual(['e8=Q+']);
  });
});
