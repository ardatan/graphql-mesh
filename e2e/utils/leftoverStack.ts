import { AsyncDisposableStack } from '@whatwg-node/disposablestack';

let leftoverStack = new AsyncDisposableStack();

export function getLeftoverStack() {
  if (leftoverStack.disposed) {
    leftoverStack = new AsyncDisposableStack();
  }
  return leftoverStack;
}

afterAll(() => leftoverStack.disposeAsync());
