import React, { useMemo } from 'react';
import { Dimensions } from 'react-native';
const {
  width: SCREEN_WIDTH
} = Dimensions.get('window');
const DEFAULT_BOARD_SIZE = Math.floor(SCREEN_WIDTH / 8) * 8;
const defaultChessboardProps = {
  gestureEnabled: true,
  colors: {
    black: '#62B1A8',
    white: '#D9FDF8',
    lastMoveHighlight: 'rgba(255,255,0, 0.5)',
    checkmateHighlight: '#E84855',
    promotionPieceButton: '#FF9B71'
  },
  durations: {
    move: 150
  },
  withLetters: true,
  withNumbers: true,
  boardSize: DEFAULT_BOARD_SIZE,
  pieceSize: DEFAULT_BOARD_SIZE / 8
};
const ChessboardPropsContext = /*#__PURE__*/React.createContext(defaultChessboardProps);
const ChessboardPropsContextProvider = /*#__PURE__*/React.memo(_ref => {
  let {
    children,
    ...rest
  } = _ref;
  const value = useMemo(() => {
    const data = { ...defaultChessboardProps,
      ...rest,
      colors: { ...defaultChessboardProps.colors,
        ...rest.colors
      },
      durations: { ...defaultChessboardProps.durations,
        ...rest.durations
      }
    };
    return { ...data,
      pieceSize: data.boardSize / 8
    };
  }, [rest]);
  return /*#__PURE__*/React.createElement(ChessboardPropsContext.Provider, {
    value: value
  }, children);
});
export { ChessboardPropsContextProvider, ChessboardPropsContext, DEFAULT_BOARD_SIZE }; // eslint-disable-next-line no-undef
//# sourceMappingURL=index.js.map