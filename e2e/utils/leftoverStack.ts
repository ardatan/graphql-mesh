import { AsyncDisposableStack, SuppressedError } from '@whatwg-node/disposablestack';

export let leftoverStack = new AsyncDisposableStack();

function trimError(error: any) {
  const stringError = error.toString();
  return stringError.split('at resolve (data:text/javascript')[0];
}

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
