"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SquareRefsContext = exports.PieceRefsContext = exports.BoardRefsContextProvider = void 0;

var _react = _interopRequireWildcard(require("react"));

var _getChessboardState = require("../../helpers/get-chessboard-state");

var _hooks = require("../chess-engine-context/hooks");

var _hooks2 = require("../board-context/hooks");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const PieceRefsContext = /*#__PURE__*/(0, _react.createContext)(null);
exports.PieceRefsContext = PieceRefsContext;
const SquareRefsContext = /*#__PURE__*/(0, _react.createContext)(null);
exports.SquareRefsContext = SquareRefsContext;

const BoardRefsContextProviderComponent = /*#__PURE__*/_react.default.forwardRef((_ref, ref) => {
  let {
    children
  } = _ref;
  const chess = (0, _hooks.useChessEngine)();
  const board = chess.board();
  const setBoard = (0, _hooks2.useSetBoard)(); // There must be a better way of doing this.

  const generateBoardRefs = (0, _react.useCallback)(() => {
    let acc = {};

    for (let x = 0; x < board.length; x++) {
      const row = board[x];

      for (let y = 0; y < row.length; y++) {
        const col = String.fromCharCode(97 + Math.round(x)); // eslint-disable-next-line no-shadow

        const row = `${8 - Math.round(y)}`;
        const square = `${col}${row}`; // eslint-disable-next-line react-hooks/rules-of-hooks

        acc = { ...acc,
          [square]: (0, _react.useRef)(null)
        };
      }
    }

    return acc;
  }, [board]);
  const pieceRefs = (0, _react.useRef)(generateBoardRefs());
  const squareRefs = (0, _react.useRef)(generateBoardRefs());
  (0, _react.useImperativeHandle)(ref, () => ({
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
      return (0, _getChessboardState.getChessboardState)(chess);
    },
    resetBoard: fen => {
      chess.reset();
      if (fen) chess.load(fen);
      setBoard(chess.board());
    }
  }), [board, chess, setBoard]);
  return /*#__PURE__*/_react.default.createElement(PieceRefsContext.Provider, {
    value: pieceRefs
  }, /*#__PURE__*/_react.default.createElement(SquareRefsContext.Provider, {
    value: squareRefs
  }, children));
});

const BoardRefsContextProvider = /*#__PURE__*/_react.default.memo(BoardRefsContextProviderComponent);

exports.BoardRefsContextProvider = BoardRefsContextProvider;
//# sourceMappingURL=index.js.map