const isObject = (value: any) =>
  value !== null && (typeof value === 'object' || typeof value === 'function');

export function isPromise(value: any) {
  return (
    value instanceof Promise ||
    (isObject(value) &&
      typeof value.then === 'function' &&
      typeof value.catch === 'function')
  );
}
