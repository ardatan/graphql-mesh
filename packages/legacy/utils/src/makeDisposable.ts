import { DisposableSymbols } from '@whatwg-node/disposablestack';

export function createDisposable(disposeFn: () => void): Disposable {
  return {
    [DisposableSymbols.dispose]: disposeFn,
  };
}

export function createAsyncDisposable(disposeFn: () => Promise<void>): AsyncDisposable {
  return {
    [DisposableSymbols.asyncDispose]: disposeFn,
  };
}

export function makeDisposable<T>(obj: T, disposeFn: () => void): T & Disposable {
  Object.defineProperty(obj, DisposableSymbols.dispose, {
    value: disposeFn,
  });
  return obj as T & Disposable;
}

export function makeAsyncDisposable<T>(
  obj: T,
  disposeFn: () => Promise<void>,
): T & AsyncDisposable {
  Object.defineProperty(obj, DisposableSymbols.asyncDispose, {
    value: disposeFn,
  });
  return obj as T & AsyncDisposable;
}
