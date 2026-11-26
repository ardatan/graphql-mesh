export function memoize5of7<
  F extends (a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: any) => any,
>(fn: F): F {
  const memoize5Cache: WeakMap<
    Record<string, any>,
    WeakMap<Record<string, any>, any>
  > = new WeakMap();
  return function memoized(a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: any) {
    let cache2 = memoize5Cache.get(a1);
    if (!cache2) {
      cache2 = new WeakMap();
      memoize5Cache.set(a1, cache2);
      const cache3 = new WeakMap();
      cache2.set(a2, cache3);
      const cache4 = new WeakMap();
      cache3.set(a3, cache4);
      const cache5 = new WeakMap();
      cache4.set(a4, cache5);
      const newValue = fn(a1, a2, a3, a4, a5, a6, a7);
      cache5.set(a5, newValue);
      return newValue;
    }

    let cache3 = cache2.get(a2);
    if (!cache3) {
      cache3 = new WeakMap();
      cache2.set(a2, cache3);
      const cache4 = new WeakMap();
      cache3.set(a3, cache4);
      const cache5 = new WeakMap();
      cache4.set(a4, cache5);
      const newValue = fn(a1, a2, a3, a4, a5, a6, a7);
      cache5.set(a5, newValue);
      return newValue;
    }

    let cache4 = cache3.get(a3);
    if (!cache4) {
      cache4 = new WeakMap();
      cache3.set(a3, cache4);
      const cache5 = new WeakMap();
      cache4.set(a4, cache5);
      const newValue = fn(a1, a2, a3, a4, a5, a6, a7);
      cache5.set(a5, newValue);
      return newValue;
    }

    let cache5 = cache4.get(a4);
    if (!cache5) {
      cache5 = new WeakMap();
      cache4.set(a4, cache5);
      const newValue = fn(a1, a2, a3, a4, a5, a6, a7);
      cache5.set(a5, newValue);
      return newValue;
    }

    const cachedValue = cache5.get(a5);
    if (cachedValue === undefined) {
      const newValue = fn(a1, a2, a3, a4, a5, a6, a7);
      cache5.set(a5, newValue);
      return newValue;
    }

    return cachedValue;
  } as F;
}
