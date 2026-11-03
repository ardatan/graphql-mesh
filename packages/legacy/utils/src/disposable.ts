import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { fakePromise, type MaybePromise } from '@whatwg-node/promise-helpers';

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

/** Kept for `@graphql-mesh/fusion-runtime` until it sets `[DisposableSymbols.asyncDispose]` directly. */
export function makeAsyncDisposable<T>(
  obj: T,
  disposeFn: () => MaybePromise<void>,
): T & AsyncDisposable {
  Object.defineProperty(obj, DisposableSymbols.asyncDispose, {
    value: () => fakePromise(disposeFn()),
    configurable: true,
    writable: true,
  });
  return obj as T & AsyncDisposable;
}
