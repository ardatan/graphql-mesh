import { createGraphQLError, isAsyncIterable, Repeater } from 'graphql-yoga';
import type { GatewayPlugin } from '../types';

export function useCompleteSubscriptionsOnSchemaChange(): GatewayPlugin {
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

                  // eslint-disable-next-line @typescript-eslint/no-floating-promises
                  stop.then(() => {
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
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
