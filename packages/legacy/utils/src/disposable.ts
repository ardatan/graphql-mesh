import { DisposableSymbols } from '@whatwg-node/disposablestack';
import type { MaybePromise } from '@whatwg-node/promise-helpers';

export function isDisposable(obj: any): obj is Disposable | AsyncDisposable {
  return obj?.[DisposableSymbols.dispose] || obj?.[DisposableSymbols.asyncDispose];
}

export function dispose<T extends AsyncDisposable>(disposable: T): MaybePromise<void>;
export function dispose<T extends Disposable>(disposable: T): void;
export function dispose<T extends AsyncDisposable | Disposable>(disposable: T): MaybePromise<void>;
export function dispose<T extends AsyncDisposable | Disposable>(disposable: T): MaybePromise<void> {
  if (DisposableSymbols.dispose in disposable) {
    return disposable[DisposableSymbols.dispose]();
  }
  if (DisposableSymbols.asyncDispose in disposable) {
    return disposable[DisposableSymbols.asyncDispose]() as Promise<void>;
  }
}

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
    configurable: true,
  });
  return obj as T & Disposable;
}

export function makeAsyncDisposable<T>(
  obj: T,
  disposeFn: () => Promise<void>,
): T & AsyncDisposable {
  Object.defineProperty(obj, DisposableSymbols.asyncDispose, {
    value: disposeFn,
    configurable: true,
  });
  return obj as T & AsyncDisposable;
}
