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
  afterAll(() => {
    try {
      leftoverStack.disposeAsync().catch(handleSuppressedError);
    } catch (e) {
      handleSuppressedError(e);
    } finally {
      leftoverStack = new AsyncDisposableStack();
    }
  });
}
