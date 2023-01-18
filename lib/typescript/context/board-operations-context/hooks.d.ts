declare const useBoardOperations: () => {
    selectableSquares: {
        value: import("chess.js").Square[];
    };
    onMove: (from: import("chess.js").Square, to: import("chess.js").Square) => void;
    onSelectPiece: (square: import("chess.js").Square) => void;
    moveTo: (to: import("chess.js").Square) => void;
    isPromoting: (from: import("chess.js").Square, to: import("chess.js").Square) => boolean;
    selectedSquare: {
        value: import("chess.js").Square | null;
    };
    turn: {
        value: "b" | "w";
    };
};
export { useBoardOperations };
