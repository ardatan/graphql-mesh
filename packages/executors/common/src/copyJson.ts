/**
 * Deep copies a value parsed from JSON, many times faster than `structuredClone`.
 * Only arrays and plain objects are walked; primitives are returned as-is.
 */
export function copyJson<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    const copy = new Array(value.length);
    for (let i = 0; i < value.length; i++) {
      copy[i] = copyJson(value[i]);
    }
    return copy as T;
  }
  const copy: Record<string, unknown> = {};
  for (const key in value) {
    if (key === '__proto__') {
      // An own `__proto__` from JSON is data; assigning it would set the prototype.
      Object.defineProperty(copy, key, {
        value: copyJson((value as Record<string, unknown>)[key]),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    } else {
      copy[key] = copyJson((value as Record<string, unknown>)[key]);
    }
  }
  return copy as T;
}
