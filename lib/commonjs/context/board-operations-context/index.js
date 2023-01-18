"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BoardOperationsContextProvider = exports.BoardOperationsContext = void 0;

var _react = _interopRequireWildcard(require("react"));

var _reactNativeReanimated = require("react-native-reanimated");

var _getChessboardState = require("../../helpers/get-chessboard-state");

var _notation = require("../../notation");

var _hooks = require("../board-context/hooks");

var _hooks2 = require("../board-promotion-context/hooks");

var _hooks3 = require("../board-refs-context/hooks");

var _hooks4 = require("../chess-engine-context/hooks");

var _hooks5 = require("../props-context/hooks");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const BoardOperationsContext = /*#__PURE__*/(0, _react.createContext)({});
exports.BoardOperationsContext = BoardOperationsContext;

const BoardOperationsContextProviderComponent = /*#__PURE__*/_react.default.forwardRef((_ref, ref) => {
  let {
    children,
    controller
  } = _ref;
  const chess = (0, _hooks4.useChessEngine)();
  const setBoard = (0, _hooks.useSetBoard)();
  const {
    pieceSize,
    onMove: onChessboardMoveCallback,
    colors: {
      checkmateHighlight
    }
  } = (0, _hooks5.useChessboardProps)();
  const {
    toTranslation
  } = (0, _notation.useReversePiecePosition)();
  const selectableSquares = (0, _reactNativeReanimated.useSharedValue)([]);
  const selectedSquare = (0, _reactNativeReanimated.useSharedValue)(null);
  const {
    showPromotionDialog
  } = (0, _hooks2.useBoardPromotion)();
  const pieceRefs = (0, _hooks3.usePieceRefs)();
  const turn = (0, _reactNativeReanimated.useSharedValue)(chess.turn());
  (0, _react.useImperativeHandle)(ref, () => ({
    reset: () => {
      selectableSquares.value = [];
      controller === null || controller === void 0 ? void 0 : controller.resetAllHighlightedSquares();
      turn.value = chess.turn();
    }
  }), [chess, controller, selectableSquares, turn]);
  const isPromoting = (0, _react.useCallback)((from, to) => {
    if (!to.includes('8') && !to.includes('1')) return false;
    const val = toTranslation(from);
    const x = Math.floor(val.x / pieceSize);
    const y = Math.floor(val.y / pieceSize);
    const piece = chess.board()[y][x];
    return (piece === null || piece === void 0 ? void 0 : piece.type) === chess.PAWN && (to.includes('8') && piece.color === chess.WHITE || to.includes('1') && piece.color === chess.BLACK);
  }, [chess, pieceSize, toTranslation]);
  const findKing = (0, _react.useCallback)(type => {
    const board = chess.board();

    for (let x = 0; x < board.length; x++) {
      const row = board[x];

      for (let y = 0; y < row.length; y++) {
        const col = String.fromCharCode(97 + Math.round(x)); // eslint-disable-next-line no-shadow

        const row = `${8 - Math.round(y)}`;
        const square = `${col}${row}`;
        const piece = chess.get(square);
        if ((piece === null || piece === void 0 ? void 0 : piece.color) === type.charAt(0) && piece.type === type.charAt(1)) return square;
      }
    }

    return null;
  }, [chess]);
  const moveProgrammatically = (0, _react.useCallback)((from, to, promotionPiece) => {
    const move = chess.move({
      from,
      to,
      promotion: promotionPiece
    });
    turn.value = chess.turn();
    if (move == null) return;
    const isCheckmate = chess.in_checkmate();

    if (isCheckmate) {
      const square = findKing(`${chess.turn()}k`);
      if (!square) return;
      controller === null || controller === void 0 ? void 0 : controller.highlight({
        square,
        color: checkmateHighlight
      });
    }

    onChessboardMoveCallback === null || onChessboardMoveCallback === void 0 ? void 0 : onChessboardMoveCallback({
      move,
      state: { ...(0, _getChessboardState.getChessboardState)(chess),
        in_promotion: promotionPiece != null
      }
    });
    setBoard(chess.board());
  }, [checkmateHighlight, chess, controller, findKing, onChessboardMoveCallback, setBoard, turn]);
  const onMove = (0, _react.useCallback)((from, to) => {
    var _pieceRefs$current, _pieceRefs$current$to, _pieceRefs$current$to2;

    selectableSquares.value = [];
    selectedSquare.value = null;
    const lastMove = {
      from,
      to
    };
    controller === null || controller === void 0 ? void 0 : controller.resetAllHighlightedSquares();
    controller === null || controller === void 0 ? void 0 : controller.highlight({
      square: lastMove.from
    });
    controller === null || controller === void 0 ? void 0 : controller.highlight({
      square: lastMove.to
    });
    const in_promotion = isPromoting(from, to);

    if (!in_promotion) {
      moveProgrammatically(from, to);
      return;
    }

    pieceRefs === null || pieceRefs === void 0 ? void 0 : (_pieceRefs$current = pieceRefs.current) === null || _pieceRefs$current === void 0 ? void 0 : (_pieceRefs$current$to = _pieceRefs$current[to]) === null || _pieceRefs$current$to === void 0 ? void 0 : (_pieceRefs$current$to2 = _pieceRefs$current$to.current) === null || _pieceRefs$current$to2 === void 0 ? void 0 : _pieceRefs$current$to2.enable(false);
    showPromotionDialog({
      type: chess.turn(),
      onSelect: piece => {
        var _pieceRefs$current2, _pieceRefs$current2$t, _pieceRefs$current2$t2;

        moveProgrammatically(from, to, piece);
        pieceRefs === null || pieceRefs === void 0 ? void 0 : (_pieceRefs$current2 = pieceRefs.current) === null || _pieceRefs$current2 === void 0 ? void 0 : (_pieceRefs$current2$t = _pieceRefs$current2[to]) === null || _pieceRefs$current2$t === void 0 ? void 0 : (_pieceRefs$current2$t2 = _pieceRefs$current2$t.current) === null || _pieceRefs$current2$t2 === void 0 ? void 0 : _pieceRefs$current2$t2.enable(true);
      }
    });
  }, [chess, controller, isPromoting, moveProgrammatically, pieceRefs, selectableSquares, selectedSquare, showPromotionDialog]);
  const onSelectPiece = (0, _react.useCallback)(square => {
    var _chess$moves;

    selectedSquare.value = square;
    const validSquares = (_chess$moves = chess.moves({
      square
    })) !== null && _chess$moves !== void 0 ? _chess$moves : []; // eslint-disable-next-line no-shadow

    selectableSquares.value = validSquares.map(square => {
      const splittedSquare = square.split('x');

      if (splittedSquare.length === 0) {
        return square;
      }

      return splittedSquare[splittedSquare.length - 1];
    });
  }, [chess, selectableSquares, selectedSquare]);
  const moveTo = (0, _react.useCallback)(to => {
    if (selectedSquare.value != null) {
      controller === null || controller === void 0 ? void 0 : controller.move({
        from: selectedSquare.value,
        to: to
      });
      return true;
    }

    return false;
  }, [controller, selectedSquare.value]);
  const value = (0, _react.useMemo)(() => {
    return {
      onMove,
      onSelectPiece,
      moveTo,
      selectableSquares,
      selectedSquare,
      isPromoting,
      turn
    };
  }, [isPromoting, moveTo, onMove, onSelectPiece, selectableSquares, selectedSquare, turn]);
  return /*#__PURE__*/_react.default.createElement(BoardOperationsContext.Provider, {
    value: value
  }, children);
});

const BoardOperationsContextProvider = /*#__PURE__*/_react.default.memo(BoardOperationsContextProviderComponent);

exports.BoardOperationsContextProvider = BoardOperationsContextProvider;
//# sourceMappingURL=index.js.map