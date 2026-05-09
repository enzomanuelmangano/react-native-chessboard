// Mock for react-native-reanimated
const createMockSharedValue = <T>(initialValue: T) => {
  let value = initialValue;
  return {
    get: () => value,
    set: (newValue: T) => {
      value = newValue;
    },
    value, // For compatibility
  };
};

export const useSharedValue = <T>(initialValue: T) =>
  createMockSharedValue(initialValue);

export const makeMutable = <T>(initialValue: T) =>
  createMockSharedValue(initialValue);

export const useDerivedValue = <T>(fn: () => T) => {
  return createMockSharedValue(fn());
};

export const withTiming = <T>(
  toValue: T,
  _config?: any,
  callback?: () => void
) => {
  // Execute callback immediately in tests
  if (callback) {
    callback();
  }
  return toValue;
};

export const withSpring = <T>(
  toValue: T,
  _config?: any,
  callback?: () => void
) => {
  // Execute callback immediately in tests
  if (callback) {
    callback();
  }
  return toValue;
};

export const runOnJS = (fn: Function) => fn;

export const Easing = {
  out: (easing: any) => easing,
  quad: (t: number) => t * t,
};

export default {
  useSharedValue,
  makeMutable,
  useDerivedValue,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
};
