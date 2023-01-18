import type { Square } from 'chess.js';
import React from 'react';
import Animated from 'react-native-reanimated';
declare type PlaceholderDotProps = {
    x: number;
    y: number;
    selectableSquares: Animated.SharedValue<Square[]>;
    moveTo?: (to: Square) => void;
};
declare const PlaceholderDot: React.FC<PlaceholderDotProps>;
export { PlaceholderDot };
