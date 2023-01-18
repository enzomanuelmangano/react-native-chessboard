"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useSetBoard = exports.useBoard = void 0;

var _react = require("react");

var _boardContextProvider = require("../board-context-provider");

const useBoard = () => {
  return (0, _react.useContext)(_boardContextProvider.BoardContext);
};

exports.useBoard = useBoard;

const useSetBoard = () => {
  return (0, _react.useContext)(_boardContextProvider.BoardSetterContext);
};

exports.useSetBoard = useSetBoard;
//# sourceMappingURL=hooks.js.map