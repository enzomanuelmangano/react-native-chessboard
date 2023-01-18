"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useConst = useConst;

var _react = require("react");

function useConst(initialValue) {
  const ref = (0, _react.useRef)();

  if (ref.current === undefined) {
    // Box the value in an object so we can tell if it's initialized even if the initializer
    // returns/is undefined
    ref.current = {
      value: typeof initialValue === 'function' ? initialValue() : initialValue
    };
  }

  return ref.current.value;
}
//# sourceMappingURL=use-const.js.map