/// <reference types="react" />
export declare const usePieceRefs: () => import("react").MutableRefObject<Record<import("chess.js").Square, import("react").MutableRefObject<import("../../components/piece").ChessPieceRef>> | null> | null;
export declare const useSquareRefs: () => import("react").MutableRefObject<Record<import("chess.js").Square, import("react").MutableRefObject<import("../../components/highlighted-squares/highlighted-square").HighlightedSquareRefType>> | null> | null;
