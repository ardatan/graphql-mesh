const prototypePollutingKeys = ['__proto__', 'constructor', 'prototype'] as const;

type PrototypePollutingKey = (typeof prototypePollutingKeys)[number];

export function isPrototypePollutingKey(key: string): key is PrototypePollutingKey {
  // @ts-expect-error - typings are incorrect
  return prototypePollutingKeys.includes(key);
}

/**
 * Own-property write that cannot pollute Object.prototype.
 * Uses defineProperty (not `obj[key]=`) so CodeQL does not treat this as a
 * prototype-polluting assignment sink.
 *
 * `__proto__` is rejected. `constructor` and `prototype` are valid GraphQL
 * response keys and are written via defineProperty (safe; does not assign
 * through the prototype chain).
 */
export function setOwnProp(obj: Record<PropertyKey, any>, key: PropertyKey, value: unknown): void {
  if (typeof key === 'string' && key === '__proto__') {
    return;
  }
  Object.defineProperty(obj, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}
