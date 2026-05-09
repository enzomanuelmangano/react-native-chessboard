// Re-export piece images for backward compatibility
export { PIECE_SOURCES as PIECES } from './assets/piece-images';

// Legacy asset list
import { PIECE_SOURCES } from './assets/piece-images';
export const assets = Object.values(PIECE_SOURCES);
