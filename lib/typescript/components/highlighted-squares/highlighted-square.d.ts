import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
declare type HighlightedSquareProps = {
    style?: StyleProp<ViewStyle>;
};
export declare type HighlightedSquareRefType = {
    isHighlighted: () => boolean;
    reset: () => void;
    highlight: (_?: {
        backgroundColor?: string;
    }) => void;
};
declare const HighlightedSquare: React.MemoExoticComponent<React.ForwardRefExoticComponent<HighlightedSquareProps & React.RefAttributes<HighlightedSquareRefType>>>;
export { HighlightedSquare };
