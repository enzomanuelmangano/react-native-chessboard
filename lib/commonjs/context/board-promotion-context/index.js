"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BoardPromotionContextProvider = exports.BoardPromotionContext = void 0;

var _react = _interopRequireWildcard(require("react"));

var _dialog = require("./dialog");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

const BoardPromotionContext = /*#__PURE__*/_react.default.createContext({
  showPromotionDialog: () => {//
  },
  isPromoting: false
});

exports.BoardPromotionContext = BoardPromotionContext;

const BoardPromotionContextProvider = /*#__PURE__*/_react.default.memo(_ref => {
  let {
    children
  } = _ref;
  const [dialog, setDialog] = (0, _react.useState)({
    isDialogActive: false
  });
  const showPromotionDialog = (0, _react.useCallback)(_ref2 => {
    let {
      type,
      onSelect
    } = _ref2;
    setDialog({
      isDialogActive: true,
      type,
      onSelect
    });
  }, []);
  const onSelect = (0, _react.useCallback)(piece => {
    var _dialog$onSelect;

    (_dialog$onSelect = dialog.onSelect) === null || _dialog$onSelect === void 0 ? void 0 : _dialog$onSelect.call(dialog, piece);
    setDialog({
      isDialogActive: false
    });
  }, [dialog]);
  const value = (0, _react.useMemo)(() => ({
    showPromotionDialog,
    isPromoting: dialog.isDialogActive
  }), [dialog.isDialogActive, showPromotionDialog]);
  return /*#__PURE__*/_react.default.createElement(BoardPromotionContext.Provider, {
    value: value
  }, dialog.isDialogActive && /*#__PURE__*/_react.default.createElement(_dialog.PromotionDialog, _extends({
    type: "w"
  }, dialog, {
    onSelect: onSelect
  })), children);
});

exports.BoardPromotionContextProvider = BoardPromotionContextProvider;
//# sourceMappingURL=index.js.map