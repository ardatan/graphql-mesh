import { createGraphQLError, isAsyncIterable, Repeater } from 'graphql-yoga';
import type { MeshServePlugin } from './types';

export function useCompleteSubscriptionsOnSchemaChange(): MeshServePlugin {
  const activeSubs: (() => void)[] = [];
  return {
    onSchemaChange() {
      while (activeSubs.length) {
        activeSubs.pop()?.();
      }
    },
    onSubscribe() {
      return {
        onSubscribeResult({ result, setResult }) {
          if (isAsyncIterable(result)) {
            setResult(
              Repeater.race([
                result,
                new Repeater((_push, stop) => {
                  function complete() {
                    stop(
                      createGraphQLError('subscription has been closed due to a schema reload', {
                        extensions: {
                          code: 'SUBSCRIPTION_SCHEMA_RELOAD',
                        },
                      }),
                    );
                  }
                  activeSubs.push(complete);

                  stop.then(() => {
                    result.return?.();
                    activeSubs.splice(activeSubs.indexOf(complete), 1);
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
