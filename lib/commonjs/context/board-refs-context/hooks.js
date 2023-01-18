"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useSquareRefs = exports.usePieceRefs = void 0;

var _react = require("react");

var _index = require("./index");

const usePieceRefs = () => {
  return (0, _react.useContext)(_index.PieceRefsContext);
};

exports.usePieceRefs = usePieceRefs;

const useSquareRefs = () => {
  return (0, _react.useContext)(_index.SquareRefsContext);
};

exports.useSquareRefs = useSquareRefs;
//# sourceMappingURL=hooks.js.map