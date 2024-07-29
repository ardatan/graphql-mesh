import { AsyncDisposableStack } from '@whatwg-node/disposablestack';

export let leftoverStack = new AsyncDisposableStack();

afterAll(() =>
  leftoverStack
    .disposeAsync()
    .catch(() => {})
    .finally(() => {
      leftoverStack = new AsyncDisposableStack();
    }),
);
