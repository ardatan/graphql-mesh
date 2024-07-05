import { isAsyncIterable, Repeater } from 'graphql-yoga';
import type { MeshServePlugin } from './types';

export function useCompleteSubscriptionsOnDispose(
  onDispose: (cb: () => void) => void,
  createError: () => Error,
): MeshServePlugin {
  return {
    onSubscribe() {
      return {
        onSubscribeResult({ result, setResult }) {
          if (isAsyncIterable(result)) {
            setResult(
              Repeater.race([
                result,
                new Repeater((_push, stop) => {
                  // eslint-disable-next-line @typescript-eslint/no-floating-promises
                  stop.then(() => result.return?.());
                  onDispose(() => {
                    stop(createError());
                  });
                }),
              ]),
            );
          }
        },
      };
    },
  };
}
