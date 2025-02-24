import { AsyncDisposableStack, SuppressedError } from '@whatwg-node/disposablestack';
import { trimError } from './trimError';

export let leftoverStack = new AsyncDisposableStack();

function handleSuppressedError(e: any) {
  let currErr = e;
  while (currErr instanceof SuppressedError) {
    if (currErr.error) {
      console.error(`Suppressed error`, trimError(currErr.error));
    }
    currErr = currErr.suppressed;
  }
  if (currErr) {
    console.error('Failed to dispose leftover stack', trimError(currErr));
  }
}

if (typeof afterAll === 'function') {
  afterAll(async () => {
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve();
          console.error('Failed to dispose leftover stack in time');
        }, 25_000);
        leftoverStack.disposeAsync().then(
          () => {
            clearTimeout(timeout);
            resolve();
          },
          e => {
            clearTimeout(timeout);
            reject(e);
          },
        );
      });
      await leftoverStack.disposeAsync();
    } catch (e) {
      handleSuppressedError(e);
    } finally {
      leftoverStack = new AsyncDisposableStack();
    }
  });
}
