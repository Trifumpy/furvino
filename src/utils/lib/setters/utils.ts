export function getImmediate<T, TArgs extends unknown[]>(
  value: T | ((...args: TArgs) => T),
  ...args: TArgs
): T {
  return typeof value === "function"
    ? (value as (...args: TArgs) => T)(...args)
    : value;
}
