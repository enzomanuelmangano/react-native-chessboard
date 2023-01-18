function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

import React, { useCallback, useMemo, useState } from 'react';
import { PromotionDialog } from './dialog';
const BoardPromotionContext = /*#__PURE__*/React.createContext({
  showPromotionDialog: () => {//
  },
  isPromoting: false
});
const BoardPromotionContextProvider = /*#__PURE__*/React.memo(_ref => {
  let {
    children
  } = _ref;
  const [dialog, setDialog] = useState({
    isDialogActive: false
  });
  const showPromotionDialog = useCallback(_ref2 => {
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
  const onSelect = useCallback(piece => {
    var _dialog$onSelect;

    (_dialog$onSelect = dialog.onSelect) === null || _dialog$onSelect === void 0 ? void 0 : _dialog$onSelect.call(dialog, piece);
    setDialog({
      isDialogActive: false
    });
  }, [dialog]);
  const value = useMemo(() => ({
    showPromotionDialog,
    isPromoting: dialog.isDialogActive
  }), [dialog.isDialogActive, showPromotionDialog]);
  return /*#__PURE__*/React.createElement(BoardPromotionContext.Provider, {
    value: value
  }, dialog.isDialogActive && /*#__PURE__*/React.createElement(PromotionDialog, _extends({
    type: "w"
  }, dialog, {
    onSelect: onSelect
  })), children);
});
export { BoardPromotionContextProvider, BoardPromotionContext };
//# sourceMappingURL=index.js.map