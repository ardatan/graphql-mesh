import AsyncDisposableStack from 'disposablestack/AsyncDisposableStack';

export const leftoverStack = new AsyncDisposableStack();

afterAll(() => leftoverStack.disposeAsync());
