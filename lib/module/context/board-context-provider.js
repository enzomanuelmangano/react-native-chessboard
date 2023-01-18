import { Chess } from 'chess.js';
import React, { useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useConst } from '../hooks/use-const';
import { BoardContext, BoardSetterContext } from './board-context';
import { BoardOperationsContextProvider } from './board-operations-context';
import { BoardPromotionContextProvider } from './board-promotion-context';
import { BoardRefsContextProvider } from './board-refs-context';
import { ChessEngineContext } from './chess-engine-context';
const ChessboardContextProviderComponent = /*#__PURE__*/React.forwardRef((_ref, ref) => {
  let {
    children,
    fen
  } = _ref;
  const chess = useConst(() => new Chess(fen));
  const chessboardRef = useRef(null);
  const boardOperationsRef = useRef(null);
  const [board, setBoard] = useState(chess.board());
  const chessboardController = useMemo(() => {
    return {
      move: params => {
        var _chessboardRef$curren, _chessboardRef$curren2;

        return (_chessboardRef$curren = chessboardRef.current) === null || _chessboardRef$curren === void 0 ? void 0 : (_chessboardRef$curren2 = _chessboardRef$curren.move) === null || _chessboardRef$curren2 === void 0 ? void 0 : _chessboardRef$curren2.call(_chessboardRef$curren, params);
      },
      highlight: params => {
        var _chessboardRef$curren3;

        return (_chessboardRef$curren3 = chessboardRef.current) === null || _chessboardRef$curren3 === void 0 ? void 0 : _chessboardRef$curren3.highlight(params);
      },
      resetAllHighlightedSquares: () => {
        var _chessboardRef$curren4;

        return (_chessboardRef$curren4 = chessboardRef.current) === null || _chessboardRef$curren4 === void 0 ? void 0 : _chessboardRef$curren4.resetAllHighlightedSquares();
      },
      getState: () => {
        var _chessboardRef$curren5;

        return chessboardRef === null || chessboardRef === void 0 ? void 0 : (_chessboardRef$curren5 = chessboardRef.current) === null || _chessboardRef$curren5 === void 0 ? void 0 : _chessboardRef$curren5.getState();
      },
      resetBoard: params => {
        var _chessboardRef$curren6, _boardOperationsRef$c;

        (_chessboardRef$curren6 = chessboardRef.current) === null || _chessboardRef$curren6 === void 0 ? void 0 : _chessboardRef$curren6.resetBoard(params);
        (_boardOperationsRef$c = boardOperationsRef.current) === null || _boardOperationsRef$c === void 0 ? void 0 : _boardOperationsRef$c.reset();
      }
    };
  }, []);
  useImperativeHandle(ref, () => chessboardController, [chessboardController]);
  return /*#__PURE__*/React.createElement(BoardContext.Provider, {
    value: board
  }, /*#__PURE__*/React.createElement(BoardPromotionContextProvider, null, /*#__PURE__*/React.createElement(ChessEngineContext.Provider, {
    value: chess
  }, /*#__PURE__*/React.createElement(BoardSetterContext.Provider, {
    value: setBoard
  }, /*#__PURE__*/React.createElement(BoardRefsContextProvider, {
    ref: chessboardRef
  }, /*#__PURE__*/React.createElement(BoardOperationsContextProvider, {
    ref: boardOperationsRef,
    controller: chessboardController
  }, children))))));
});
const ChessboardContextProvider = /*#__PURE__*/React.memo(ChessboardContextProviderComponent);
export { ChessboardContextProvider, ChessEngineContext, BoardContext, BoardSetterContext };
//# sourceMappingURL=board-context-provider.js.map