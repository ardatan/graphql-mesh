import type { Logger } from '@graphql-mesh/types';
import type { GatewayPlugin } from '../types';

export function useFetchDebug<TContext>(opts: { logger: Logger }): GatewayPlugin<TContext> {
  return {
    onFetch({ url, options, logger = opts.logger }) {
      logger = logger.child('fetch');
      logger.debug(
        'request',
        JSON.stringify(
          {
            url,
            ...(options || {}),
          },
          null,
          '  ',
        ),
      );
      return function onFetchDone({ response }) {
        logger.debug('response', () =>
          JSON.stringify(
            {
              url,
              status: response.status,
              headers: Object.fromEntries(response.headers.entries()),
            },
            null,
            '  ',
          ),
        );
      };
    },
  };
}
