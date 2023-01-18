import type { PieceType } from 'chess.js';
import React from 'react';
import type { Player } from '../../types';
declare const BoardContext: React.Context<({
    type: PieceType;
    color: "b" | "w";
} | null)[][]>;
declare const BoardSetterContext: React.Context<React.Dispatch<React.SetStateAction<({
    type: PieceType;
    color: Player;
} | null)[][]>>>;
export { BoardContext, BoardSetterContext };
