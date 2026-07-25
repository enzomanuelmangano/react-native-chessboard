// Mock for react-native-reanimated
import { useRef } from 'react';

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

// The real hook returns the SAME mutable across renders. Returning a fresh
// object here would make every shared value an unstable dependency, so effects
// keyed on them would re-run every render in tests but not on device — hiding
// exactly the class of bug those dependency arrays exist to prevent.
export const useSharedValue = <T>(initialValue: T) => {
  const ref = useRef<ReturnType<typeof createMockSharedValue<T>> | null>(null);
  if (!ref.current) {
    ref.current = createMockSharedValue(initialValue);
  }
  return ref.current;
};

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
  callback?: (finished?: boolean) => void
) => {
  // Execute callback immediately in tests, as a settled animation
  if (callback) {
    callback(true);
  }
  return toValue;
};

export const runOnJS = (fn: Function) => fn;

export const Easing = {
  out: (easing: any) => easing,
  in: (easing: any) => easing,
  quad: (t: number) => t * t,
  cubic: (t: number) => t * t * t,
};

// Fires the reaction once with no previous value, mirroring the initial
// invocation on device.
export const useAnimatedReaction = <T>(
  prepare: () => T,
  react: (current: T, previous: T | null) => void,
  _deps?: unknown[]
) => {
  react(prepare(), null);
};

export default {
  useAnimatedReaction,
  useSharedValue,
  makeMutable,
  useDerivedValue,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
};
