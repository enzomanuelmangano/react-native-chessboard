import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useChessboardProps } from '../../context/props-context/hooks';
import { useChessEngine } from '../../context/chess-engine-context/hooks';
import { useReversePiecePosition } from '../../notation';
import { HighlightedSquare } from './highlighted-square';
import { useSquareRefs } from '../../context/board-refs-context/hooks';
const HighlightedSquares = /*#__PURE__*/React.memo(() => {
  const chess = useChessEngine();
  const board = useMemo(() => chess.board(), [chess]);
  const {
    pieceSize
  } = useChessboardProps();
  const {
    toPosition,
    toTranslation
  } = useReversePiecePosition();
  const refs = useSquareRefs();
  return /*#__PURE__*/React.createElement(View, {
    style: { ...StyleSheet.absoluteFillObject
    }
  }, board.map((row, y) => row.map((_, x) => {
    var _refs$current;

    const square = toPosition({
      x: x * pieceSize,
      y: y * pieceSize
    });
    const translation = toTranslation(square);
    return /*#__PURE__*/React.createElement(HighlightedSquare, {
      key: `${x}-${y}`,
      ref: refs === null || refs === void 0 ? void 0 : (_refs$current = refs.current) === null || _refs$current === void 0 ? void 0 : _refs$current[square],
      style: [styles.highlightedSquare, {
        width: pieceSize,
        transform: [{
          translateX: translation.x
        }, {
          translateY: translation.y
        }]
      }]
    });
  })));
});
const styles = StyleSheet.create({
  highlightedSquare: {
    position: 'absolute',
    aspectRatio: 1
  }
});
export { HighlightedSquares };
//# sourceMappingURL=index.js.map