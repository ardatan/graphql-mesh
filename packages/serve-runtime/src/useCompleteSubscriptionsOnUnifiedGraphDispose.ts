import { createGraphQLError, isAsyncIterable, Repeater } from 'graphql-yoga';
import type { MeshServePlugin } from './types';

export function useCompleteSubscriptionsOnUnifiedGraphDispose(
  onDispose: (cb: () => void) => void,
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
                  stop.then(() => result.return?.());
                  onDispose(() => {
                    stop(
                      createGraphQLError(
                        'subscription has been closed because the server is shutting down',
                        {
                          extensions: {
                            code: 'SHUTTING_DOWN',
                          },
                        },
                      ),
                    );
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
