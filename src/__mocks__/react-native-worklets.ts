// Mock for react-native-worklets
// scheduleOnRN(fn, ...args) invokes fn(...args) synchronously in tests
export const scheduleOnRN = <T extends (...args: any[]) => any>(
  fn: T,
  ...args: Parameters<T>
): void => {
  fn(...args);
};
export const scheduleOnUI = <T extends (...args: any[]) => any>(
  fn: T,
  ...args: Parameters<T>
): void => {
  fn(...args);
};
export const scheduleOnRuntime = <T extends (...args: any[]) => any>(
  fn: T,
  ...args: Parameters<T>
): void => {
  fn(...args);
};

// On device this hops to the UI runtime and blocks until the worklet returns.
// There is one runtime in tests, so running it inline preserves the property
// callers rely on: everything inside has been applied by the time it returns.
// A jest.fn so tests can assert how many transactions a reset takes.
export const runOnUISync = jest.fn(
  <Args extends unknown[], ReturnValue>(
    worklet: (...args: Args) => ReturnValue,
    ...args: Args
  ): ReturnValue => worklet(...args)
);

export default {
  scheduleOnRN,
  scheduleOnUI,
  scheduleOnRuntime,
  runOnUISync,
};
