function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

import React from 'react';
import { Image } from 'react-native';
import { PIECES } from '../../constants';
import { useChessboardProps } from '../../context/props-context/hooks';
const ChessPiece = /*#__PURE__*/React.memo(_ref => {
  var _renderPiece;

  let {
    id,
    ...rest
  } = _ref;
  const {
    pieceSize,
    renderPiece
  } = useChessboardProps();
  return (_renderPiece = renderPiece === null || renderPiece === void 0 ? void 0 : renderPiece(id)) !== null && _renderPiece !== void 0 ? _renderPiece : /*#__PURE__*/React.createElement(Image, _extends({
    style: [{
      width: pieceSize,
      height: pieceSize
    }, rest.style]
  }, rest, {
    source: PIECES[id]
  }));
});
export { ChessPiece };
//# sourceMappingURL=visual-piece.js.map