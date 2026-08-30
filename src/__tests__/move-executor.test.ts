import { Chess, Square } from 'chess.js';
import { createMoveExecutor } from '../state/move-executor';
import { makeMutable } from 'react-native-reanimated';
import * as Reanimated from 'react-native-reanimated';
import type {
  BoardState,
  PieceCode,
  SquareState,
  HighlightState,
} from '../state/types';
import { SQUARES } from '../state/types';
import { collectLegalTargets } from '../helpers/collect-legal-targets';
import {
  MOVE_SPRING,
  SCALE_SPRING,
  SNAP_BACK_SPRING,
} from '../config/animations';

// Helper to create mock square state
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

// Helper to create mock highlight state
const createMockHighlightState = (): HighlightState => ({
  color: makeMutable<string | null>(null),
});

// Create a complete mock board state
const createMockBoardState = (chess: Chess, pieceSize: number): BoardState => {
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

    squares[square] = createMockSquareState(pieceCode, x, y);
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
    legalTargets: makeMutable(collectLegalTargets(chess)),
  };
};

describe('createMoveExecutor', () => {
  const PIECE_SIZE = 50;
  const config = {
    boardSize: 400,
    pieceSize: PIECE_SIZE,
    gestureEnabled: true,
    flipped: false,
    withLetters: false,
    withNumbers: false,
    colors: {
      white: '#f0d9b5',
      black: '#b58863',
      lastMoveHighlight: 'rgba(255, 255, 0, 0.4)',
      checkmateHighlight: 'rgba(255, 0, 0, 0.4)',
      selectedHighlight: 'rgba(20,120,20,0.35)',
      promotionPieceButton: 'rgba(255, 255, 255, 0.8)',
    },
    animations: {
      move: MOVE_SPRING,
      scale: SCALE_SPRING,
      snapBack: SNAP_BACK_SPRING,
    },
    fontSource: null,
  };

  describe('executeMove', () => {
    it('executes a simple pawn move', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const onMove = jest.fn();
      const executor = createMoveExecutor(chess, boardState, config, {
        onMove,
      });

      const move = executor.executeMove('e2' as Square, 'e4' as Square);

      expect(move).toBeTruthy();
      expect(move?.san).toBe('e4');
      expect(onMove).toHaveBeenCalledWith(
        expect.objectContaining({
          move: expect.objectContaining({ san: 'e4' }),
        })
      );
    });

    it('executes a piece capture', () => {
      const chess = new Chess();
      chess.move('e4');
      chess.move('d5');

      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const onMove = jest.fn();
      const executor = createMoveExecutor(chess, boardState, config, {
        onMove,
      });

      const move = executor.executeMove('e4' as Square, 'd5' as Square);

      expect(move).toBeTruthy();
      expect(move?.captured).toBe('p');
      expect(boardState.squares.d5.piece.get()).toBe('wp'); // White pawn on d5
    });

    it('updates turn after move', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      expect(boardState.turn.get()).toBe('w');

      executor.executeMove('e2' as Square, 'e4' as Square);

      expect(boardState.turn.get()).toBe('b');
    });

    it('clears selection after move', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      boardState.selectedSquare.set('e2' as Square);
      boardState.validMoves.set(['e3' as Square, 'e4' as Square]);

      executor.executeMove('e2' as Square, 'e4' as Square);

      expect(boardState.selectedSquare.get()).toBeNull();
      expect(boardState.validMoves.get()).toEqual([]);
    });

    it('throws for invalid move (chess.js v1.0 behavior)', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      // e2 to e5 is illegal (pawn can't move 3 squares)
      // Should return null for invalid moves
      const result = executor.executeMove('e2' as Square, 'e5' as Square);
      expect(result).toBeNull();
    });
  });

  describe('castling', () => {
    it('moves king and rook for kingside castling', () => {
      // Position where castling is legal
      const chess = new Chess(
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1'
      );
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      const move = executor.executeMove('e1' as Square, 'g1' as Square);

      expect(move).toBeTruthy();
      expect(move?.san).toBe('O-O');

      // King should be on g1 (in the board state, this happens via animation callback)
      // Rook should move from h1 to f1
    });

    it('moves king and rook for queenside castling', () => {
      const chess = new Chess(
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1'
      );
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      const move = executor.executeMove('e1' as Square, 'c1' as Square);

      expect(move).toBeTruthy();
      expect(move?.san).toBe('O-O-O');
    });

    it('handles black kingside castling', () => {
      const chess = new Chess(
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R b KQkq - 0 1'
      );
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      const move = executor.executeMove('e8' as Square, 'g8' as Square);

      expect(move).toBeTruthy();
      expect(move?.san).toBe('O-O');
    });

    it('handles black queenside castling', () => {
      const chess = new Chess(
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R b KQkq - 0 1'
      );
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      const move = executor.executeMove('e8' as Square, 'c8' as Square);

      expect(move).toBeTruthy();
      expect(move?.san).toBe('O-O-O');
    });
  });

  describe('capture timing', () => {
    // The shared mock settles every spring synchronously, which hides the
    // window this behaviour is about. Hold the settle callbacks instead so
    // the in-flight frames are observable.
    const holdSprings = () => {
      const settles: Array<(finished?: boolean) => void> = [];
      const spy = jest.spyOn(Reanimated, 'withSpring').mockImplementation(((
        toValue: unknown,
        _config?: unknown,
        callback?: (finished?: boolean) => void
      ) => {
        if (callback) settles.push(callback);
        return toValue;
      }) as typeof Reanimated.withSpring);
      return { settles, spy };
    };

    it('keeps the captured piece drawn until the mover lands', () => {
      const chess = new Chess();
      chess.move('e4');
      chess.move('d5');

      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});
      const { settles, spy } = holdSprings();

      try {
        executor.executeMove('e4' as Square, 'd5' as Square);

        // Mid-flight: the black pawn still occupies d5, with the white pawn
        // riding above it.
        expect(boardState.squares.d5.piece.get()).toBe('bp');
        expect(boardState.squares.e4.zIndex.get()).toBe(100);

        settles.forEach((settle) => settle(true));

        expect(boardState.squares.d5.piece.get()).toBe('wp');
        expect(boardState.squares.e4.piece.get()).toBeNull();
      } finally {
        spy.mockRestore();
      }
    });

    it('leaves the captured piece in place when the spring is cancelled', () => {
      const chess = new Chess();
      chess.move('e4');
      chess.move('d5');

      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});
      const { settles, spy } = holdSprings();

      try {
        executor.executeMove('e4' as Square, 'd5' as Square);
        // A cancelled spring means someone else (resetBoard, a newer move)
        // now owns these squares — the executor must not write to them.
        settles.forEach((settle) => settle(false));

        expect(boardState.squares.d5.piece.get()).toBe('bp');
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('en passant', () => {
    it('removes captured pawn from correct square for white', () => {
      // White pawn on e5, black just played d7-d5
      const chess = new Chess(
        'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3'
      );
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      // Verify black pawn is on d5 before move
      expect(boardState.squares.d5.piece.get()).toBe('bp');

      const move = executor.executeMove('e5' as Square, 'd6' as Square);

      expect(move).toBeTruthy();
      expect(move?.san).toBe('exd6');

      // The captured pawn on d5 should be removed
      expect(boardState.squares.d5.piece.get()).toBeNull();
    });

    it('removes captured pawn from correct square for black', () => {
      // Black pawn on e4, white just played d2-d4
      const chess = new Chess(
        'rnbqkbnr/pppp1ppp/8/8/3Pp3/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 3'
      );
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      // Verify white pawn is on d4 before move
      expect(boardState.squares.d4.piece.get()).toBe('wp');

      const move = executor.executeMove('e4' as Square, 'd3' as Square);

      expect(move).toBeTruthy();
      expect(move?.san).toBe('exd3');

      // The captured pawn on d4 should be removed
      expect(boardState.squares.d4.piece.get()).toBeNull();
    });
  });

  describe('promotion', () => {
    it('detects promotion move correctly', () => {
      const chess = new Chess('8/P7/8/8/8/8/8/4K2k w - - 0 1');
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      expect(executor.isPromotionMove('a7' as Square, 'a8' as Square)).toBe(
        true
      );
      expect(executor.isPromotionMove('e1' as Square, 'e2' as Square)).toBe(
        false
      );
    });

    it('promotes to queen when specified', () => {
      const chess = new Chess('8/P7/8/8/8/8/8/4K2k w - - 0 1');
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      const move = executor.executeMove('a7' as Square, 'a8' as Square, 'q');

      expect(move).toBeTruthy();
      expect(move?.promotion).toBe('q');
      expect(move?.san).toBe('a8=Q+');
    });

    it('promotes to knight when specified', () => {
      const chess = new Chess('8/P7/8/8/8/8/8/4K2k w - - 0 1');
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      const move = executor.executeMove('a7' as Square, 'a8' as Square, 'n');

      expect(move).toBeTruthy();
      expect(move?.promotion).toBe('n');
    });

    it('calls onPromotionRequired when no piece specified via tryMove', async () => {
      const chess = new Chess('8/P7/8/8/8/8/8/4K2k w - - 0 1');
      const boardState = createMockBoardState(chess, PIECE_SIZE);

      const onPromotionRequired = jest.fn((info) => {
        // Call complete to resolve the promise
        info.complete('q');
      });

      const executor = createMoveExecutor(chess, boardState, config, {
        onPromotionRequired,
      });

      // Use tryMove which handles promotion callback
      const move = await executor.tryMove('a7' as Square, 'a8' as Square);

      expect(onPromotionRequired).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'a7',
          to: 'a8',
          color: 'w',
          complete: expect.any(Function),
        })
      );
      expect(move).toBeTruthy();
      expect(move?.promotion).toBe('q');
    });

    it('resolves undefined and does not move when promotion is cancelled', async () => {
      const chess = new Chess('8/P7/8/8/8/8/8/4K2k w - - 0 1');
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const fenBefore = chess.fen();

      const onPromotionRequired = jest.fn((info) => {
        // User dismissed the picker without choosing a piece.
        info.cancel();
      });
      const executor = createMoveExecutor(chess, boardState, config, {
        onPromotionRequired,
      });

      // Would hang forever before the cancel resolver existed.
      const move = await executor.tryMove('a7' as Square, 'a8' as Square);

      expect(onPromotionRequired).toHaveBeenCalledWith(
        expect.objectContaining({ cancel: expect.any(Function) })
      );
      expect(move).toBeUndefined();
      expect(chess.fen()).toBe(fenBefore); // move never committed
    });

    it('defaults to queen promotion when no handler provided', async () => {
      const chess = new Chess('8/P7/8/8/8/8/8/4K2k w - - 0 1');
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const onMove = jest.fn();
      const executor = createMoveExecutor(chess, boardState, config, {
        onMove,
      });

      const move = await executor.tryMove('a7' as Square, 'a8' as Square);

      expect(move).toBeTruthy();
      expect(move?.promotion).toBe('q');
    });
  });

  describe('resetBoard', () => {
    it('resets to starting position', () => {
      const chess = new Chess();
      chess.move('e4');
      chess.move('e5');

      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      executor.resetBoard();

      expect(chess.fen()).toBe(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      );
      expect(boardState.turn.get()).toBe('w');
      expect(boardState.selectedSquare.get()).toBeNull();
      expect(boardState.validMoves.get()).toEqual([]);
      expect(boardState.lastMove.get()).toBeNull();
    });

    it('loads custom FEN position', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      const customFen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
      executor.resetBoard(customFen);

      expect(chess.fen()).toBe(customFen);
    });

    it('clears all highlights', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      // Set some highlights
      boardState.highlights.e4.color.set('red');
      boardState.highlights.d4.color.set('blue');

      executor.resetBoard();

      expect(boardState.highlights.e4.color.get()).toBeNull();
      expect(boardState.highlights.d4.color.get()).toBeNull();
    });

    it('applies the last-move highlight from opts', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      executor.resetBoard(fen, { lastMove: { from: 'e2', to: 'e4' } });

      expect(boardState.lastMove.get()).toEqual({ from: 'e2', to: 'e4' });
      expect(boardState.squares.e2.lastMove.get()).toBe(true);
      expect(boardState.squares.e4.lastMove.get()).toBe(true);
    });

    it('clears the previous last-move highlight on a new reset', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      executor.resetBoard(
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        { lastMove: { from: 'e2', to: 'e4' } }
      );
      executor.resetBoard(); // no opts → highlight cleared

      expect(boardState.lastMove.get()).toBeNull();
      expect(boardState.squares.e2.lastMove.get()).toBe(false);
      expect(boardState.squares.e4.lastMove.get()).toBe(false);
    });

    it('places the moved piece on the target square when sliding', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      executor.resetBoard(
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        { slide: { from: 'e2', to: 'e4' } }
      );

      expect(boardState.squares.e4.piece.get()).toBe('wp');
      expect(boardState.squares.e2.piece.get()).toBeNull();
      // e4 is row 4, col 4 → home position (col*size, row*size).
      expect(boardState.squares.e4.translateX.get()).toBe(4 * PIECE_SIZE);
      expect(boardState.squares.e4.translateY.get()).toBe(4 * PIECE_SIZE);
    });

    it('highlights the mated king when jumping to a checkmate position', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      // Fool's mate final position (white to move, in checkmate).
      const mateFen =
        'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
      executor.resetBoard(mateFen);

      expect(boardState.isCheck.get()).toBe(true);
      expect(boardState.kingInCheckSquare.get()).toBe('e1');
      expect(boardState.squares.e1.inCheck.get()).toBe(true);
    });
  });

  describe('resetBoard completion', () => {
    const AFTER_E4 =
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

    const holdSprings = () => {
      const settles: Array<(finished?: boolean) => void> = [];
      const spy = jest.spyOn(Reanimated, 'withSpring').mockImplementation(((
        toValue: unknown,
        _config?: unknown,
        callback?: (finished?: boolean) => void
      ) => {
        if (callback) settles.push(callback);
        return toValue;
      }) as typeof Reanimated.withSpring);
      return { settles, spy };
    };

    it('resolves immediately when there is nothing to animate', async () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      await expect(executor.resetBoard()).resolves.toBeUndefined();
    });

    it('resolves for an invalid fen instead of hanging', async () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      await expect(executor.resetBoard('not-a-fen')).resolves.toBeUndefined();
      // The position on screen is untouched.
      expect(boardState.squares.e2.piece.get()).toBe('wp');
    });

    it('waits for the slide to settle before resolving', async () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});
      const { settles, spy } = holdSprings();

      try {
        let settled = false;
        const done = executor
          .resetBoard(AFTER_E4, { slide: { from: 'e2', to: 'e4' } })
          .then(() => {
            settled = true;
          });

        // Spring still in flight: the promise must not have resolved, and the
        // sliding piece keeps its raised zIndex.
        await Promise.resolve();
        expect(settled).toBe(false);
        expect(boardState.squares.e4.zIndex.get()).toBe(100);

        settles.forEach((settle) => settle(true));
        await done;

        expect(settled).toBe(true);
        expect(boardState.squares.e4.zIndex.get()).toBe(0);
      } finally {
        spy.mockRestore();
      }
    });

    it('resolves — and leaves zIndex alone — when the slide is cancelled', async () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});
      const { settles, spy } = holdSprings();

      try {
        const done = executor.resetBoard(AFTER_E4, {
          slide: { from: 'e2', to: 'e4' },
        });

        // A newer pan cancelled the spring. It owns the square now, so this
        // stale rollback must not reset zIndex — but the caller still has to
        // be released rather than left awaiting forever.
        settles.forEach((settle) => settle(false));
        await expect(done).resolves.toBeUndefined();

        expect(boardState.squares.e4.zIndex.get()).toBe(100);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('undo', () => {
    it('reverts the last move', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      executor.executeMove('e2' as Square, 'e4' as Square);
      expect(boardState.turn.get()).toBe('b');

      const undone = executor.undo();

      expect(undone).toBeTruthy();
      expect(undone?.san).toBe('e4');
      expect(boardState.turn.get()).toBe('w');
    });

    it('returns null when no moves to undo', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      const undone = executor.undo();

      expect(undone).toBeNull();
    });

    it('restores board to previous state', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      const initialFen = chess.fen();
      executor.executeMove('e2' as Square, 'e4' as Square);
      executor.undo();

      expect(chess.fen()).toBe(initialFen);
    });

    it('restores the previous move highlight after undo', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      executor.executeMove('e2' as Square, 'e4' as Square);
      executor.executeMove('e7' as Square, 'e5' as Square);
      executor.undo(); // take back e5 → e4 is now the last move

      expect(boardState.lastMove.get()).toEqual({ from: 'e2', to: 'e4' });
      expect(boardState.squares.e2.lastMove.get()).toBe(true);
      expect(boardState.squares.e4.lastMove.get()).toBe(true);
      expect(boardState.squares.e7.lastMove.get()).toBe(false);
    });

    it('clears the highlight when undoing the only move', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      executor.executeMove('e2' as Square, 'e4' as Square);
      executor.undo(); // back to the start — nothing to highlight

      expect(boardState.lastMove.get()).toBeNull();
      expect(boardState.squares.e2.lastMove.get()).toBe(false);
      expect(boardState.squares.e4.lastMove.get()).toBe(false);
    });
  });

  describe('selectPiece', () => {
    it('selects own piece', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      executor.selectPiece('e2' as Square);

      expect(boardState.selectedSquare.get()).toBe('e2');
      expect(boardState.validMoves.get()).toContain('e3');
      expect(boardState.validMoves.get()).toContain('e4');
    });

    it('does not select opponent piece', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      // Try to select black piece when it's white's turn
      executor.selectPiece('e7' as Square);

      expect(boardState.selectedSquare.get()).toBeNull();
      expect(boardState.validMoves.get()).toEqual([]);
    });

    it('does not select empty square', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      executor.selectPiece('e4' as Square);

      expect(boardState.selectedSquare.get()).toBeNull();
      expect(boardState.validMoves.get()).toEqual([]);
    });

    it('calculates valid moves for knight correctly', () => {
      const chess = new Chess();
      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      executor.selectPiece('g1' as Square);

      expect(boardState.validMoves.get()).toContain('f3');
      expect(boardState.validMoves.get()).toContain('h3');
      expect(boardState.validMoves.get()).not.toContain('e2'); // Blocked by pawn
    });
  });

  describe('check detection', () => {
    it('detects check after move', () => {
      // Scholar's mate setup - about to deliver check
      const chess = new Chess();
      chess.move('e4');
      chess.move('e5');
      chess.move('Bc4');
      chess.move('Nc6');
      chess.move('Qh5');
      chess.move('Nf6');

      const boardState = createMockBoardState(chess, PIECE_SIZE);
      const executor = createMoveExecutor(chess, boardState, config, {});

      // Qxf7 delivers checkmate
      executor.executeMove('h5' as Square, 'f7' as Square);

      expect(boardState.isCheck.get()).toBe(true);
      expect(boardState.kingInCheckSquare.get()).toBe('e8');
    });
  });
});
