import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useBoardOperations } from '../../context/board-operations-context/hooks';
import { useChessEngine } from '../../context/chess-engine-context/hooks';
import { PlaceholderDot } from './PlaceholderDot';
const SuggestedDots = /*#__PURE__*/React.memo(() => {
  const chess = useChessEngine();
  const {
    moveTo,
    selectableSquares
  } = useBoardOperations();
  const board = useMemo(() => chess.board(), [chess]);
  return /*#__PURE__*/React.createElement(View, {
    style: { ...StyleSheet.absoluteFillObject
    }
  }, board.map((row, y) => row.map((_, x) => {
    return /*#__PURE__*/React.createElement(PlaceholderDot, {
      key: `${x}-${y}`,
      x: x,
      y: y,
      selectableSquares: selectableSquares,
      moveTo: moveTo
    });
  })));
});
export { SuggestedDots };
//# sourceMappingURL=index.js.map