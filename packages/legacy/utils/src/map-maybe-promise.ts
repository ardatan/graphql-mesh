import { isPromise, type MaybePromise } from '@graphql-tools/utils';

export function mapMaybePromise<T, R>(
  value: MaybePromise<T>,
  mapper: (v: T) => MaybePromise<R>,
): MaybePromise<R> {
  return isPromise(value) ? value.then(mapper) : mapper(value);
}
