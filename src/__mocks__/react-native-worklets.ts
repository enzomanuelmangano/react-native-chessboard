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

export default {
  scheduleOnRN,
  scheduleOnUI,
  scheduleOnRuntime,
};
