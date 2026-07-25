import React from 'react';
import { act, create } from 'react-test-renderer';
import { runOnUISync } from 'react-native-worklets';
import { useBoardState } from '../state/use-board-state';
import type { BoardState } from '../state/types';
import { SQUARES } from '../state/types';
import { squareToPosition } from '../state/use-board-state';
import type { Chess } from 'chess.js';

type Captured = { boardState: BoardState; chess: Chess };

const PIECE_SIZE = 50;

const Probe: React.FC<{
  fen: string | undefined;
  onMount: (captured: Captured) => void;
}> = ({ fen, onMount }) => {
  const captured = useBoardState(fen, PIECE_SIZE, false);
  // Capture once per render so the test can read the latest state after a re-render.
  React.useEffect(() => {
    onMount(captured);
  });
  return null;
};

const renderWithFen = (fen: string | undefined) => {
  let captured: Captured | null = null;
  let renderer: ReturnType<typeof create> | null = null;
  const update = (next: string | undefined) => {
    if (!renderer) return;
    act(() => {
      renderer!.update(
        <Probe
          fen={next}
          onMount={(c) => {
            captured = c;
          }}
        />
      );
    });
  };
  act(() => {
    renderer = create(
      <Probe
        fen={fen}
        onMount={(c) => {
          captured = c;
        }}
      />
    );
  });
  if (!captured) {
    throw new Error('Probe did not capture board state on first render');
  }
  return {
    get current(): Captured {
      if (!captured) throw new Error('captured is null');
      return captured;
    },
    update,
  };
};

const collectPieces = (boardState: BoardState): Record<string, string | null> =>
  SQUARES.reduce<Record<string, string | null>>((acc, square) => {
    acc[square] = boardState.squares[square].piece.get();
    return acc;
  }, {});

describe('useBoardState — fen prop reactivity', () => {
  const STARTING_FEN =
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const KIWIPETE_FEN =
    'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';

  it('rebuilds chess state and pieces when fen prop changes', () => {
    const handle = renderWithFen(STARTING_FEN);

    expect(handle.current.chess.fen()).toBe(STARTING_FEN);
    expect(handle.current.boardState.squares.e4.piece.get()).toBeNull();

    handle.update(KIWIPETE_FEN);

    expect(handle.current.chess.fen()).toBe(KIWIPETE_FEN);
    // Kiwipete has a white pawn on e4 and a black knight on f6.
    expect(handle.current.boardState.squares.e4.piece.get()).toBe('wp');
    expect(handle.current.boardState.squares.f6.piece.get()).toBe('bn');
  });

  it('snaps every piece to its new layout coordinates without animating', () => {
    const handle = renderWithFen(STARTING_FEN);
    handle.update(KIWIPETE_FEN);

    // Kiwipete white knight on e5 — verify its translate matches the
    // squareToPosition helper for the new FEN.
    const e5 = handle.current.boardState.squares.e5;
    const expected = squareToPosition('e5', PIECE_SIZE, false);
    expect(e5.translateX.get()).toBe(expected.x);
    expect(e5.translateY.get()).toBe(expected.y);
    expect(e5.scale.get()).toBe(1);
    expect(e5.zIndex.get()).toBe(0);
  });

  it('clears highlights, last move, selection, and check state on fen change', () => {
    const handle = renderWithFen(STARTING_FEN);

    // Pollute state as if the user had been interacting with the board.
    handle.current.boardState.highlights.e4.color.set('red');
    handle.current.boardState.lastMove.set({ from: 'e2', to: 'e4' });
    handle.current.boardState.selectedSquare.set('e2');
    handle.current.boardState.validMoves.set(['e3', 'e4']);
    handle.current.boardState.kingInCheckSquare.set('e1');
    handle.current.boardState.isCheck.set(true);

    handle.update(KIWIPETE_FEN);

    expect(handle.current.boardState.highlights.e4.color.get()).toBeNull();
    expect(handle.current.boardState.lastMove.get()).toBeNull();
    expect(handle.current.boardState.selectedSquare.get()).toBeNull();
    expect(handle.current.boardState.validMoves.get()).toEqual([]);
    expect(handle.current.boardState.kingInCheckSquare.get()).toBeNull();
    // Kiwipete is not a check position
    expect(handle.current.boardState.isCheck.get()).toBe(false);
  });

  it('resets to the standard starting position when fen becomes undefined', () => {
    const handle = renderWithFen(KIWIPETE_FEN);
    expect(handle.current.boardState.squares.e4.piece.get()).toBe('wp');

    handle.update(undefined);

    expect(handle.current.chess.fen()).toBe(STARTING_FEN);
    const startingPieces = collectPieces(handle.current.boardState);
    expect(startingPieces.e2).toBe('wp');
    expect(startingPieces.e4).toBeNull();
    expect(startingPieces.e7).toBe('bp');
  });

  it('keeps chess instance identity stable across fen changes', () => {
    const handle = renderWithFen(STARTING_FEN);
    const initialChess = handle.current.chess;
    handle.update(KIWIPETE_FEN);
    expect(handle.current.chess).toBe(initialChess);
  });

  describe('reset atomicity', () => {
    const runOnUISyncSpy = runOnUISync as unknown as jest.Mock;

    beforeEach(() => {
      runOnUISyncSpy.mockClear?.();
    });

    it('applies the whole reset in a single UI-runtime transaction', () => {
      const handle = renderWithFen(STARTING_FEN);
      const callsAfterMount = runOnUISyncSpy.mock.calls.length;

      handle.update(KIWIPETE_FEN);

      // One transaction for the swap — not one write per square. Skia cannot
      // draw a half-applied position if the whole reset lands together.
      expect(runOnUISyncSpy.mock.calls.length - callsAfterMount).toBe(1);
    });

    it('carries every square and every board-level field in that one call', () => {
      const handle = renderWithFen(STARTING_FEN);
      runOnUISyncSpy.mockClear();

      handle.update(KIWIPETE_FEN);

      const { boardState } = handle.current;
      // All 64 squares reflect the new position...
      const pieces = collectPieces(boardState);
      expect(pieces.e4).toBe('wp');
      expect(pieces.f6).toBe('bn');
      // Kiwipete has a white bishop on e2, not the starting pawn.
      expect(pieces.e2).toBe('wb');
      expect(Object.keys(pieces)).toHaveLength(64);
      // ...and so does the board-level state, from the same transaction.
      expect(boardState.turn.get()).toBe('w');
      expect(boardState.selectedSquare.get()).toBeNull();
      expect(boardState.validMoves.get()).toEqual([]);
      expect(boardState.lastMove.get()).toBeNull();
      expect(boardState.kingInCheckSquare.get()).toBeNull();
    });

    it('does not run a transaction when the fen prop is unchanged', () => {
      const handle = renderWithFen(STARTING_FEN);
      runOnUISyncSpy.mockClear();

      handle.update(STARTING_FEN);

      expect(runOnUISyncSpy).not.toHaveBeenCalled();
    });

    it('does not run a transaction for an invalid fen', () => {
      const handle = renderWithFen(STARTING_FEN);
      runOnUISyncSpy.mockClear();

      handle.update('not-a-fen');

      // Bails before the transaction, leaving the position on screen intact.
      expect(runOnUISyncSpy).not.toHaveBeenCalled();
      expect(handle.current.boardState.squares.e2.piece.get()).toBe('wp');
    });
  });
});
