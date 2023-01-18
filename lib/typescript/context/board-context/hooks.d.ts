/// <reference types="react" />
declare const useBoard: () => ({
    type: import("chess.js").PieceType;
    color: "b" | "w";
} | null)[][];
declare const useSetBoard: () => import("react").Dispatch<import("react").SetStateAction<({
    type: import("chess.js").PieceType;
    color: "b" | "w";
} | null)[][]>>;
export { useBoard, useSetBoard };
