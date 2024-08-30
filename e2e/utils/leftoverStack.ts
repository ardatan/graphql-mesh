import { AsyncDisposableStack } from '@whatwg-node/disposablestack';

export let leftoverStack = new AsyncDisposableStack();

afterAll(() => {
  const disposeRes$ = leftoverStack.disposeAsync();
  if (disposeRes$?.finally) {
    return disposeRes$.finally(() => {
      leftoverStack = new AsyncDisposableStack();
    });
  }
  leftoverStack = new AsyncDisposableStack();
});
