import type { Chess, Square } from 'chess.js';
import type { LegalTargets } from '../state/types';

/**
 * Every legal move in the current position, grouped by origin square.
 *
 * The gesture handler needs to judge a drop on the UI thread, but legality
 * lives in chess.js on the JS thread. Publishing the whole position's moves
 * whenever it changes means the drop never has to wait for a round trip —
 * which is what previously let a fast drag be validated against the
 * previously selected piece (or against nothing at all).
 *
 * One `moves()` call for the whole board, not one per square: chess.js
 * generates all of them anyway, so grouping is far cheaper than 64 calls.
 */
export const collectLegalTargets = (chess: Chess): LegalTargets => {
  const targets: LegalTargets = {};

  for (const move of chess.moves({ verbose: true })) {
    const from = move.from as Square;
    const existing = targets[from];
    if (existing) {
      existing.push(move.to as Square);
    } else {
      targets[from] = [move.to as Square];
    }
  }

  return targets;
};
