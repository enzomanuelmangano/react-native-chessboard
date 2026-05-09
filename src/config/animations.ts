import type { WithSpringConfig } from 'react-native-reanimated';

/**
 * Spring animation configurations for the chessboard.
 *
 * These are critically damped springs (dampingRatio = 1) which means:
 * - No oscillation/bouncing
 * - Fastest approach to target without overshoot
 * - Formula: damping = 2 * sqrt(stiffness * mass)
 */

// Move animation: Used when pieces move to their destination
export const MOVE_SPRING: WithSpringConfig = {
  stiffness: 400,
  damping: 40,
  mass: 1,
};

// Scale animation: Used when lifting/dropping pieces
export const SCALE_SPRING: WithSpringConfig = {
  stiffness: 600,
  damping: 49,
  mass: 1,
};

// Snap-back animation: Used when invalid moves snap back to origin
export const SNAP_BACK_SPRING: WithSpringConfig = {
  stiffness: 350,
  damping: 37,
  mass: 1,
};
