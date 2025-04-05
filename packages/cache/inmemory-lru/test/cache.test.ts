import { DisposableSymbols } from '@whatwg-node/disposablestack';
import InMemoryLRUCache from '../src/index';

it('should not have race condition with getting while ttl setting values', async () => {
  const cache = new InMemoryLRUCache();

  const parallelism = 5;
  const timeout = AbortSignal.timeout(3000);

  (async () => {
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

  cache[DisposableSymbols.dispose]();
});
