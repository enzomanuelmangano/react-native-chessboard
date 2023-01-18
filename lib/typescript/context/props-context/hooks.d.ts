export declare const useChessboardProps: () => import("./index").ChessboardProps & Required<Pick<import("./index").ChessboardProps, "gestureEnabled" | "withLetters" | "withNumbers" | "boardSize">> & {
    pieceSize: number;
} & {
    colors: Required<{
        white: string;
        black: string;
        lastMoveHighlight?: string | undefined;
        checkmateHighlight?: string | undefined;
        promotionPieceButton?: string | undefined;
    }>;
    durations: Required<{
        move?: number | undefined;
    }>;
};
