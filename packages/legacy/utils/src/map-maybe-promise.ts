import { handleMaybePromise, type MaybePromise } from '@whatwg-node/promise-helpers';

/**
 * Compatibility wrapper around {@link handleMaybePromise} matching the old
 * `mapMaybePromise(value, onSuccess, onError?)` signature removed from
 * `@graphql-tools/utils` / `@whatwg-node/promise-helpers` v2.
 */
export function mapMaybePromise<TInput, TOutput = TInput>(
  input: MaybePromise<TInput>,
  onSuccess: (value: TInput) => MaybePromise<TOutput>,
  onError?: (error: any) => MaybePromise<TOutput>,
): MaybePromise<TOutput> {
  return handleMaybePromise(() => input, onSuccess, onError);
}
