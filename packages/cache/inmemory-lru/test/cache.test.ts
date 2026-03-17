import { DisposableSymbols } from '@whatwg-node/disposablestack';
import InMemoryLRUCache from '../src/index';

it('should not have race condition with getting while ttl setting values', async () => {
  const cache = new InMemoryLRUCache();

  const parallelism = 5;
  const timeout = AbortSignal.timeout(3000);

  // Capture the setter task so it can be awaited — an un-awaited floating promise would
  // be reported as a memory leak by Jest's --detectLeaks flag.
  const setterTask = (async () => {
    while (!timeout.aborted) {
      await Promise.all(
        [...Array(parallelism)].map(
          () =>
            new Promise(resolve =>
              setTimeout(
                () =>
                  resolve(
                    cache.set('key', 'value', {
                      ttl: 1, // ttl is in seconds
                    }),
                  ),
                10,
              ),
            ),
        ),
      );
    }
  })();

  while (!timeout.aborted) {
    await expect(
      Promise.all(
        [...Array(parallelism)].map(
          () => new Promise(resolve => setTimeout(() => resolve(cache.get('key')), 10)),
        ),
      ),
    ).resolves.toEqual([...Array(parallelism)].map(() => 'value'));
  }

  // Wait for the setter loop to finish its current iteration before disposing.
  await setterTask;

  cache[DisposableSymbols.dispose]();
});
