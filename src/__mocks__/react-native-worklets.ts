// Mock for react-native-worklets
// scheduleOnRN returns a wrapper function that can be called with arguments
export const scheduleOnRN = <T extends (...args: any[]) => any>(fn: T): T => fn;
export const scheduleOnUI = <T extends (...args: any[]) => any>(fn: T): T => fn;
export const scheduleOnRuntime = <T extends (...args: any[]) => any>(
  fn: T
): T => fn;

export default {
  scheduleOnRN,
  scheduleOnUI,
  scheduleOnRuntime,
};
