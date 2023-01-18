import React from 'react';
import { useChessboardProps } from '../context/props-context/hooks';
import { useBoard } from '../context/board-context/hooks';
import { usePieceRefs } from '../context/board-refs-context/hooks';
import Piece from './piece';
import { useReversePiecePosition } from '../notation';
const Pieces = /*#__PURE__*/React.memo(() => {
  const board = useBoard();
  const refs = usePieceRefs();
  const {
    pieceSize
  } = useChessboardProps();
  const {
    toPosition
  } = useReversePiecePosition();
  return /*#__PURE__*/React.createElement(React.Fragment, null, board.map((row, y) => row.map((piece, x) => {
    if (piece !== null) {
      var _refs$current;

      const square = toPosition({
        x: x * pieceSize,
        y: y * pieceSize
      });
      return /*#__PURE__*/React.createElement(Piece, {
        ref: refs === null || refs === void 0 ? void 0 : (_refs$current = refs.current) === null || _refs$current === void 0 ? void 0 : _refs$current[square],
        key: `${x}-${y}`,
        id: `${piece.color}${piece.type}`,
        startPosition: {
          x,
          y
        },
        square: square,
        size: pieceSize
      });
    }

    return null;
  })));
});
export { Pieces };
//# sourceMappingURL=pieces.js.map