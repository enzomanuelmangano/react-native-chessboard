import { useRef } from 'react';

function useConst(initialValue) {
  const ref = useRef();

  if (ref.current === undefined) {
    // Box the value in an object so we can tell if it's initialized even if the initializer
    // returns/is undefined
    ref.current = {
      value: typeof initialValue === 'function' ? initialValue() : initialValue
    };
  }

  return ref.current.value;
}

export { useConst };
//# sourceMappingURL=use-const.js.map