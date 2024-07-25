import { loggerForExecutionRequest } from '@graphql-mesh/fusion-runtime';
import type { Logger } from '@graphql-mesh/types';
import type { MeshServePlugin } from './types';

export function useFetchDebug<TContext>(opts: { logger: Logger }): MeshServePlugin<TContext> {
  return {
    onFetch({ url, options, logger = opts.logger }) {
      logger = logger.child('fetch');
      logger.debug('request', {
        url,
        ...(options || {}),
      });
      return function onFetchDone({ response }) {
        logger.debug('response', {
          url,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        });
      };
    },
  };
}
