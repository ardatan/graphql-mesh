import { withFilter } from '../src/with-filter.js';

function isEven(x: number) {
  if (x === undefined) {
    throw Error('Undefined value passed to filterFn');
  }
  return x % 2 === 0;
}

const testFiniteAsyncIterator: AsyncIterableIterator<number> = (async function* () {
  for (const value of [1, 2, 3, 4, 5, 6, 7, 8]) {
    yield value;
  }
})();

describe('withFilter', () => {
  it('works properly with finite asyncIterators', async () => {
    const filteredAsyncIterator = await withFilter(() => testFiniteAsyncIterator, isEven)();

    for (let i = 1; i <= 4; i++) {
      const result = await filteredAsyncIterator.next();
      expect(result).toBeDefined();
      expect(result.value).toEqual(i * 2);
      expect(result.done).toBe(false);
    }
    const doneResult = await filteredAsyncIterator.next();
    expect(doneResult).toBeDefined();
    expect(doneResult.value).toBeUndefined();
    expect(doneResult.done).toBe(true);
  });
});
