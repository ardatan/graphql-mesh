import { AsyncDisposableStack, SuppressedError } from '@whatwg-node/disposablestack';

export let leftoverStack = new AsyncDisposableStack();

function handleSuppressedError(e: any) {
  let currErr = e;
  while (currErr instanceof SuppressedError) {
    console.error(`Suppressed error`, currErr.error);
    currErr = currErr.suppressed;
  }
  console.error('Failed to dispose leftover stack', currErr);
}

afterAll(() => {
  try {
    const disposeRes$ = leftoverStack.disposeAsync();
    if (disposeRes$?.catch) {
      return disposeRes$.catch(handleSuppressedError).finally(() => {
        leftoverStack = new AsyncDisposableStack();
      });
    }
  } catch (e) {
    handleSuppressedError(e);
  }
  leftoverStack = new AsyncDisposableStack();
});
