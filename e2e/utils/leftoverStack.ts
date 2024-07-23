import AsyncDisposableStack from 'disposablestack/AsyncDisposableStack';

let leftoverStack = new AsyncDisposableStack();

export function getLeftoverStack() {
  if (leftoverStack.disposed) {
    leftoverStack = new AsyncDisposableStack();
  }
  return leftoverStack;
}

afterAll(() => leftoverStack.disposeAsync());
