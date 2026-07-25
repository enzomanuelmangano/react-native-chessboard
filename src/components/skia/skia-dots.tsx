import React from 'react';
import { Path, PathOp, Skia, rect } from '@shopify/react-native-skia';
import type { DerivedValue, SharedValue } from 'react-native-reanimated';
import {
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { Square } from 'chess.js';
import { BoardConfig, BoardState } from '../../state/types';
import { squareToPosition } from '../../state/use-board-state';

interface SkiaDotsProps {
  config: BoardConfig;
  boardState: BoardState;
}

// A queen on an open board has 27 targets — the most any single piece can
// offer — so a fixed pool of that size always covers a selection. Keeping the
// count fixed means selecting a piece never re-renders React: every dot reads
// the shared state itself and simply draws nothing when its slot is unused.
const DOT_POOL_SIZE = 27;

const REVEAL_MS = 260;
const DISMISS_MS = 180;
// Per-square-of-distance delay, as a fraction of the reveal. Capped so a
// far-flung queen move still starts before the near ones have finished.
const STAGGER_PER_SQUARE = 0.1;
const MAX_STAGGER = 0.55;
const DOT_ALPHA = 0.5;
// Capture marker: the square minus the circle inscribed in it, leaving four
// corner wedges framing the piece. Matches how lichess marks an occupied
// target — nothing is ever drawn over the piece itself.
//
// The cut is a genuine path Difference, NOT an even-odd fill. Even-odd is
// XOR: any part of the circle poking outside the square counts as "inside
// circle, outside rect" and gets painted into the neighbouring squares. That
// caps XOR at a radius of 0.5. Difference has no such limit, so the circle
// can grow past the square's edges — which is what thins the wedges down to
// slivers in the corners.
const CAPTURE_INNER = 0.58;
// Corner wedges cover more area than a dot, so they need less alpha to carry
// the same weight.
const CAPTURE_ALPHA = 0.3;

type DotSet = { moves: Square[]; origin: Square | null };

/**
 * Progress of a single dot, 0 → 1, offset by how far its square sits from the
 * piece being touched. Chebyshev distance matches how pieces move, so a
 * knight's targets land together instead of splitting into two clumps.
 */
export const dotProgress = (
  reveal: number,
  targetX: number,
  targetY: number,
  originX: number | null,
  originY: number | null,
  pieceSize: number
) => {
  'worklet';
  let delay = 0;
  if (originX !== null && originY !== null) {
    const dx = Math.abs(targetX - originX) / pieceSize;
    const dy = Math.abs(targetY - originY) / pieceSize;
    delay = Math.min(Math.max(dx, dy) * STAGGER_PER_SQUARE, MAX_STAGGER);
  }
  return Math.min(Math.max((reveal - delay) / (1 - delay), 0), 1);
};

interface DotProps {
  index: number;
  reveal: DerivedValue<number>;
  displayed: SharedValue<DotSet>;
  config: BoardConfig;
  boardState: BoardState;
}

const Dot: React.FC<DotProps> = ({
  index,
  reveal,
  displayed,
  config,
  boardState,
}) => {
  const { pieceSize, flipped } = config;
  // ~32% of a square in diameter. Chess UIs converge on roughly 30% (lichess,
  // chess.com); much larger starts competing with the piece it sits under.
  const radius = pieceSize * 0.16;
  const half = pieceSize / 2;

  const progress = useDerivedValue(() => {
    const { moves, origin } = displayed.get();
    if (index >= moves.length) return 0;

    const pos = squareToPosition(moves[index], pieceSize, flipped);
    const originPos = origin
      ? squareToPosition(origin, pieceSize, flipped)
      : null;

    return dotProgress(
      reveal.get(),
      pos.x,
      pos.y,
      originPos ? originPos.x : null,
      originPos ? originPos.y : null,
      pieceSize
    );
  });

  // Whether this target already holds a piece — i.e. the move is a capture.
  // Only the squares in the current selection are read, and only while a
  // selection is live, so this does not subscribe to the whole board.
  const isCapture = useDerivedValue(() => {
    const { moves } = displayed.get();
    if (index >= moves.length) return false;
    return boardState.squares[moves[index]].piece.get() !== null;
  });

  // Empty target: a plain dot. Occupied target: nothing is drawn over the
  // piece at all — instead the square minus a circle leaves shaded corners
  // around it. One path each, because a Skia Path carries a single paint;
  // the unused one stays empty.
  const dotPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const { moves } = displayed.get();
    const t = progress.get();
    if (index >= moves.length || t <= 0 || isCapture.get()) return p;

    const pos = squareToPosition(moves[index], pieceSize, flipped);
    p.addCircle(pos.x + half, pos.y + half, radius * t);
    return p;
  });

  const capturePath = useDerivedValue(() => {
    const square = Skia.Path.Make();
    const { moves } = displayed.get();
    const t = progress.get();
    if (index >= moves.length || t <= 0 || !isCapture.get()) return square;

    const pos = squareToPosition(moves[index], pieceSize, flipped);
    square.addRect(rect(pos.x, pos.y, pieceSize, pieceSize));

    const hole = Skia.Path.Make();
    hole.addCircle(pos.x + half, pos.y + half, pieceSize * CAPTURE_INNER);

    // Falls back to the plain square if the op ever fails, which is visible
    // rather than silently blank.
    return Skia.Path.MakeFromOp(square, hole, PathOp.Difference) ?? square;
  });

  // The wedges are a fixed shape, so the reveal rides on opacity alone.
  const captureOpacity = useDerivedValue(
    () => Math.min(progress.get() * 1.6, 1) * CAPTURE_ALPHA
  );

  // Opacity leads the scale slightly so a dot reads as fading in while it
  // grows, rather than appearing at full strength the instant it has size.
  const opacity = useDerivedValue(
    () => Math.min(progress.get() * 1.6, 1) * DOT_ALPHA
  );

  return (
    <>
      <Path path={dotPath} color="rgba(0, 0, 0, 0.3)" opacity={opacity} />
      <Path
        path={capturePath}
        color="rgba(0, 0, 0, 0.3)"
        opacity={captureOpacity}
      />
    </>
  );
};

export const SkiaDots: React.FC<SkiaDotsProps> = React.memo(
  ({ config, boardState }) => {
    // The targets currently being drawn. Deliberately NOT cleared when the
    // selection ends: the dismiss animation still needs their positions to
    // shrink them away. It is only ever replaced by a new selection.
    const displayed = useSharedValue<DotSet>({ moves: [], origin: null });

    useAnimatedReaction(
      () => boardState.validMoves.get(),
      (moves) => {
        if (moves.length > 0) {
          displayed.set({ moves, origin: boardState.selectedSquare.get() });
        }
      },
      [boardState]
    );

    // 0 with nothing selected, 1 while a selection is live — so the same
    // staggered ramp plays forwards on select and backwards on deselect.
    // Animating inside the derived value (rather than assigning `withTiming`
    // from a reaction) is what keeps the per-dot derived values re-evaluating
    // for the whole ramp.
    const reveal = useDerivedValue<number>(() => {
      const selecting = boardState.validMoves.get().length > 0;
      return withTiming(selecting ? 1 : 0, {
        duration: selecting ? REVEAL_MS : DISMISS_MS,
        easing: selecting ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      });
    });

    return (
      <>
        {Array.from({ length: DOT_POOL_SIZE }, (_, index) => (
          <Dot
            key={index}
            index={index}
            reveal={reveal}
            displayed={displayed}
            config={config}
            boardState={boardState}
          />
        ))}
      </>
    );
  }
);

SkiaDots.displayName = 'SkiaDots';
