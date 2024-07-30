import { AsyncDisposableStack } from '@whatwg-node/disposablestack';

export let leftoverStack = new AsyncDisposableStack();

afterAll(() =>
  leftoverStack.disposeAsync().finally(() => {
    leftoverStack = new AsyncDisposableStack();
  }),
);
