"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "BoardContext", {
  enumerable: true,
  get: function () {
    return _boardContext.BoardContext;
  }
});
Object.defineProperty(exports, "BoardSetterContext", {
  enumerable: true,
  get: function () {
    return _boardContext.BoardSetterContext;
  }
});
Object.defineProperty(exports, "ChessEngineContext", {
  enumerable: true,
  get: function () {
    return _chessEngineContext.ChessEngineContext;
  }
});
exports.ChessboardContextProvider = void 0;

var _chess = require("chess.js");

var _react = _interopRequireWildcard(require("react"));

var _useConst = require("../hooks/use-const");

var _boardContext = require("./board-context");

var _boardOperationsContext = require("./board-operations-context");

var _boardPromotionContext = require("./board-promotion-context");

var _boardRefsContext = require("./board-refs-context");

var _chessEngineContext = require("./chess-engine-context");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const ChessboardContextProviderComponent = /*#__PURE__*/_react.default.forwardRef((_ref, ref) => {
  let {
    children,
    fen
  } = _ref;
  const chess = (0, _useConst.useConst)(() => new _chess.Chess(fen));
  const chessboardRef = (0, _react.useRef)(null);
  const boardOperationsRef = (0, _react.useRef)(null);
  const [board, setBoard] = (0, _react.useState)(chess.board());
  const chessboardController = (0, _react.useMemo)(() => {
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
  (0, _react.useImperativeHandle)(ref, () => chessboardController, [chessboardController]);
  return /*#__PURE__*/_react.default.createElement(_boardContext.BoardContext.Provider, {
    value: board
  }, /*#__PURE__*/_react.default.createElement(_boardPromotionContext.BoardPromotionContextProvider, null, /*#__PURE__*/_react.default.createElement(_chessEngineContext.ChessEngineContext.Provider, {
    value: chess
  }, /*#__PURE__*/_react.default.createElement(_boardContext.BoardSetterContext.Provider, {
    value: setBoard
  }, /*#__PURE__*/_react.default.createElement(_boardRefsContext.BoardRefsContextProvider, {
    ref: chessboardRef
  }, /*#__PURE__*/_react.default.createElement(_boardOperationsContext.BoardOperationsContextProvider, {
    ref: boardOperationsRef,
    controller: chessboardController
  }, children))))));
});

const ChessboardContextProvider = /*#__PURE__*/_react.default.memo(ChessboardContextProviderComponent);

exports.ChessboardContextProvider = ChessboardContextProvider;
//# sourceMappingURL=board-context-provider.js.map