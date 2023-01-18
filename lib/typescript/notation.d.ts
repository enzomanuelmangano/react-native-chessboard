import type { Square } from 'chess.js';
import type { Vector } from './types';
declare const useReversePiecePosition: () => {
    toPosition: ({ x, y }: Vector) => Square;
    toTranslation: (to: Square) => {
        x: number;
        y: number;
    };
};
export { useReversePiecePosition };
