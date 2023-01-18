import React, { createContext, useCallback, useImperativeHandle, useRef } from 'react';
import { getChessboardState } from '../../helpers/get-chessboard-state';
import { useChessEngine } from '../chess-engine-context/hooks';
import { useSetBoard } from '../board-context/hooks';
const PieceRefsContext = /*#__PURE__*/createContext(null);
const SquareRefsContext = /*#__PURE__*/createContext(null);
const BoardRefsContextProviderComponent = /*#__PURE__*/React.forwardRef((_ref, ref) => {
  let {
    children
  } = _ref;
  const chess = useChessEngine();
  const board = chess.board();
  const setBoard = useSetBoard(); // There must be a better way of doing this.

  const generateBoardRefs = useCallback(() => {
    let acc = {};

    for (let x = 0; x < board.length; x++) {
      const row = board[x];

      for (let y = 0; y < row.length; y++) {
        const col = String.fromCharCode(97 + Math.round(x)); // eslint-disable-next-line no-shadow

        const row = `${8 - Math.round(y)}`;
        const square = `${col}${row}`; // eslint-disable-next-line react-hooks/rules-of-hooks

        acc = { ...acc,
          [square]: useRef(null)
        };
      }
    }

    return acc;
  }, [board]);
  const pieceRefs = useRef(generateBoardRefs());
  const squareRefs = useRef(generateBoardRefs());
  useImperativeHandle(ref, () => ({
    move: _ref2 => {
      var _pieceRefs$current, _pieceRefs$current$fr, _pieceRefs$current$fr2;

      let {
        from,
        to
      } = _ref2;
      return pieceRefs === null || pieceRefs === void 0 ? void 0 : (_pieceRefs$current = pieceRefs.current) === null || _pieceRefs$current === void 0 ? void 0 : (_pieceRefs$current$fr = _pieceRefs$current[from].current) === null || _pieceRefs$current$fr === void 0 ? void 0 : (_pieceRefs$current$fr2 = _pieceRefs$current$fr.moveTo) === null || _pieceRefs$current$fr2 === void 0 ? void 0 : _pieceRefs$current$fr2.call(_pieceRefs$current$fr, to);
    },
    highlight: _ref3 => {
      var _squareRefs$current;

      let {
        square,
        color
      } = _ref3;
      (_squareRefs$current = squareRefs.current) === null || _squareRefs$current === void 0 ? void 0 : _squareRefs$current[square].current.highlight({
        backgroundColor: color
      });
    },
    resetAllHighlightedSquares: () => {
      for (let x = 0; x < board.length; x++) {
        const row = board[x];

        for (let y = 0; y < row.length; y++) {
          var _squareRefs$current2;

          const col = String.fromCharCode(97 + Math.round(x)); // eslint-disable-next-line no-shadow

          const row = `${8 - Math.round(y)}`;
          const square = `${col}${row}`;
          (_squareRefs$current2 = squareRefs.current) === null || _squareRefs$current2 === void 0 ? void 0 : _squareRefs$current2[square].current.reset();
        }
      }
    },
    getState: () => {
      return getChessboardState(chess);
    },
    resetBoard: fen => {
      chess.reset();
      if (fen) chess.load(fen);
      setBoard(chess.board());
    }
  }), [board, chess, setBoard]);
  return /*#__PURE__*/React.createElement(PieceRefsContext.Provider, {
    value: pieceRefs
  }, /*#__PURE__*/React.createElement(SquareRefsContext.Provider, {
    value: squareRefs
  }, children));
});
const BoardRefsContextProvider = /*#__PURE__*/React.memo(BoardRefsContextProviderComponent);
export { PieceRefsContext, SquareRefsContext, BoardRefsContextProvider };
//# sourceMappingURL=index.js.map