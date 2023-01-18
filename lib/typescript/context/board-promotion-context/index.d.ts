import React from 'react';
import type { ChessInstance, PieceType } from 'chess.js';
export declare type BoardPromotionContextType = {
    showPromotionDialog: (_: {
        type: PromotionDialogType;
        onSelect?: (_: PieceType) => void;
    }) => void;
    isPromoting: boolean;
};
declare const BoardPromotionContext: React.Context<BoardPromotionContextType>;
declare type PromotionDialogType = ReturnType<ChessInstance['turn']>;
export declare type BoardPromotionContextState = {
    isDialogActive: boolean;
    type?: PromotionDialogType;
    onSelect?: (_: PieceType) => void;
};
declare const BoardPromotionContextProvider: React.FC;
export { BoardPromotionContextProvider, BoardPromotionContext };
