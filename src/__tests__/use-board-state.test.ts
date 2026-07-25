import { Chess, Square } from 'chess.js';
import { makeMutable } from 'react-native-reanimated';
import type {
  PieceCode,
  SquareState,
  HighlightState,
  BoardState,
} from '../state/types';
import { SQUARES } from '../state/types';
import { collectLegalTargets } from '../helpers/collect-legal-targets';
import { squareToPosition } from '../state/use-board-state';

// Helper to create a board state similar to useBoardState
const createBoardState = (
  fen: string | undefined,
  pieceSize: number
): { boardState: BoardState; chess: Chess } => {
  const chess = new Chess(fen);

  const squares: Partial<Record<Square, SquareState>> = {};
  const highlights: Partial<Record<Square, HighlightState>> = {};

  for (const square of SQUARES) {
    const col = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - parseInt(square[1], 10);
    const x = col * pieceSize;
    const y = row * pieceSize;

    const piece = chess.get(square);
    const pieceCode: PieceCode = piece
      ? (`${piece.color}${piece.type}` as PieceCode)
      : null;

    squares[square] = {
      piece: makeMutable<PieceCode>(pieceCode),
      translateX: makeMutable(x),
      translateY: makeMutable(y),
      scale: makeMutable(1),
      zIndex: makeMutable(0),
      lastMove: makeMutable(false),
      inCheck: makeMutable(false),
    };
    highlights[square] = {
      color: makeMutable<string | null>(null),
    };
  }

  const boardState: BoardState = {
    squares: squares as Record<Square, SquareState>,
    highlights: highlights as Record<Square, HighlightState>,
    turn: makeMutable(chess.turn()),
    selectedSquare: makeMutable<Square | null>(null),
    validMoves: makeMutable<Square[]>([]),
    lastMove: makeMutable<{ from: Square; to: Square } | null>(null),
    isCheck: makeMutable(false),
    kingInCheckSquare: makeMutable<Square | null>(null),
    legalTargets: makeMutable(collectLegalTargets(chess)),
  };

  return { boardState, chess };
};

describe('useBoardState', () => {
  const PIECE_SIZE = 50;

  describe('initialization', () => {
    it('creates 64 square states', () => {
      const { boardState } = createBoardState(undefined, PIECE_SIZE);

      expect(Object.keys(boardState.squares).length).toBe(64);
    });

    it('initializes pieces from starting position', () => {
      const { boardState } = createBoardState(undefined, PIECE_SIZE);

      // Check white pieces
      expect(boardState.squares.e1.piece.get()).toBe('wk'); // White king
      expect(boardState.squares.d1.piece.get()).toBe('wq'); // White queen
      expect(boardState.squares.a1.piece.get()).toBe('wr'); // White rook
      expect(boardState.squares.h1.piece.get()).toBe('wr'); // White rook
      expect(boardState.squares.b1.piece.get()).toBe('wn'); // White knight
      expect(boardState.squares.g1.piece.get()).toBe('wn'); // White knight
      expect(boardState.squares.c1.piece.get()).toBe('wb'); // White bishop
      expect(boardState.squares.f1.piece.get()).toBe('wb'); // White bishop
      expect(boardState.squares.e2.piece.get()).toBe('wp'); // White pawn

      // Check black pieces
      expect(boardState.squares.e8.piece.get()).toBe('bk'); // Black king
      expect(boardState.squares.d8.piece.get()).toBe('bq'); // Black queen
      expect(boardState.squares.a8.piece.get()).toBe('br'); // Black rook
      expect(boardState.squares.e7.piece.get()).toBe('bp'); // Black pawn
    });

    it('initializes pieces from custom FEN', () => {
      const customFen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
      const { boardState } = createBoardState(customFen, PIECE_SIZE);

      // Verify king positions (no pieces between rook and king)
      expect(boardState.squares.e1.piece.get()).toBe('wk');
      expect(boardState.squares.e8.piece.get()).toBe('bk');

      // Verify empty squares between rook and king
      expect(boardState.squares.b1.piece.get()).toBeNull();
      expect(boardState.squares.c1.piece.get()).toBeNull();
      expect(boardState.squares.d1.piece.get()).toBeNull();
      expect(boardState.squares.f1.piece.get()).toBeNull();
      expect(boardState.squares.g1.piece.get()).toBeNull();
    });

    it('sets correct initial turn', () => {
      const { boardState } = createBoardState(undefined, PIECE_SIZE);
      expect(boardState.turn.get()).toBe('w');
    });

    it('sets correct turn from FEN', () => {
      const fenBlackToMove =
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const { boardState } = createBoardState(fenBlackToMove, PIECE_SIZE);
      expect(boardState.turn.get()).toBe('b');
    });

    it('initializes all highlights as null', () => {
      const { boardState } = createBoardState(undefined, PIECE_SIZE);

      for (const square of SQUARES) {
        expect(boardState.highlights[square].color.get()).toBeNull();
      }
    });

    it('initializes selected square as null', () => {
      const { boardState } = createBoardState(undefined, PIECE_SIZE);
      expect(boardState.selectedSquare.get()).toBeNull();
    });

    it('initializes valid moves as empty', () => {
      const { boardState } = createBoardState(undefined, PIECE_SIZE);
      expect(boardState.validMoves.get()).toEqual([]);
    });

    it('initializes last move as null', () => {
      const { boardState } = createBoardState(undefined, PIECE_SIZE);
      expect(boardState.lastMove.get()).toBeNull();
    });

    it('initializes isCheck as false', () => {
      const { boardState } = createBoardState(undefined, PIECE_SIZE);
      expect(boardState.isCheck.get()).toBe(false);
    });

    it('initializes kingInCheckSquare as null', () => {
      const { boardState } = createBoardState(undefined, PIECE_SIZE);
      expect(boardState.kingInCheckSquare.get()).toBeNull();
    });
  });

  describe('position calculations', () => {
    it('calculates correct positions for corner squares', () => {
      // a8 (top-left)
      const a8Pos = squareToPosition('a8', PIECE_SIZE);
      expect(a8Pos).toEqual({ x: 0, y: 0 });

      // h8 (top-right)
      const h8Pos = squareToPosition('h8', PIECE_SIZE);
      expect(h8Pos).toEqual({ x: 7 * PIECE_SIZE, y: 0 });

      // a1 (bottom-left)
      const a1Pos = squareToPosition('a1', PIECE_SIZE);
      expect(a1Pos).toEqual({ x: 0, y: 7 * PIECE_SIZE });

      // h1 (bottom-right)
      const h1Pos = squareToPosition('h1', PIECE_SIZE);
      expect(h1Pos).toEqual({ x: 7 * PIECE_SIZE, y: 7 * PIECE_SIZE });
    });

    it('calculates correct positions for center squares', () => {
      // e4
      const e4Pos = squareToPosition('e4', PIECE_SIZE);
      expect(e4Pos).toEqual({ x: 4 * PIECE_SIZE, y: 4 * PIECE_SIZE });

      // d5
      const d5Pos = squareToPosition('d5', PIECE_SIZE);
      expect(d5Pos).toEqual({ x: 3 * PIECE_SIZE, y: 3 * PIECE_SIZE });
    });

    it('initializes pieces at correct positions', () => {
      const { boardState } = createBoardState(undefined, PIECE_SIZE);

      // Check e2 pawn position
      const e2State = boardState.squares.e2;
      expect(e2State.translateX.get()).toBe(4 * PIECE_SIZE);
      expect(e2State.translateY.get()).toBe(6 * PIECE_SIZE);

      // Check e8 king position
      const e8State = boardState.squares.e8;
      expect(e8State.translateX.get()).toBe(4 * PIECE_SIZE);
      expect(e8State.translateY.get()).toBe(0);
    });
  });

  describe('scale and z-index', () => {
    it('initializes all scales to 1', () => {
      const { boardState } = createBoardState(undefined, PIECE_SIZE);

      for (const square of SQUARES) {
        expect(boardState.squares[square].scale.get()).toBe(1);
      }
    });

    it('initializes all z-indexes to 0', () => {
      const { boardState } = createBoardState(undefined, PIECE_SIZE);

      for (const square of SQUARES) {
        expect(boardState.squares[square].zIndex.get()).toBe(0);
      }
    });
  });

  describe('empty squares', () => {
    it('initializes middle ranks as empty', () => {
      const { boardState } = createBoardState(undefined, PIECE_SIZE);

      // Ranks 3-6 should be empty
      const emptySquares = ['e3', 'e4', 'e5', 'e6', 'a3', 'h4', 'd5', 'f6'];
      for (const square of emptySquares) {
        expect(boardState.squares[square as Square].piece.get()).toBeNull();
      }
    });
  });

  describe('SQUARES constant', () => {
    it('contains all 64 squares', () => {
      expect(SQUARES.length).toBe(64);
    });

    it('contains correct squares in order', () => {
      // First row should be rank 8
      expect(SQUARES[0]).toBe('a8');
      expect(SQUARES[7]).toBe('h8');

      // Last row should be rank 1
      expect(SQUARES[56]).toBe('a1');
      expect(SQUARES[63]).toBe('h1');
    });

    it('contains all files', () => {
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      for (const file of files) {
        const squaresInFile = SQUARES.filter((s) => s[0] === file);
        expect(squaresInFile.length).toBe(8);
      }
    });

    it('contains all ranks', () => {
      const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
      for (const rank of ranks) {
        const squaresInRank = SQUARES.filter((s) => s[1] === rank);
        expect(squaresInRank.length).toBe(8);
      }
    });
  });
});
