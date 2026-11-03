import type { Plugin } from '@envelop/core';
import { useLiveQuery } from '@envelop/live-query';
import type { Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { type YamlConfig } from '@graphql-mesh/types';
import {
  defaultResourceIdentifierNormalizer,
  InMemoryLiveQueryStore,
} from '@n1ru4l/in-memory-live-query-store';
import { fakePromise } from '@whatwg-node/promise-helpers';
import { useInvalidateByResult } from './useInvalidateByResult.js';

export default function useMeshLiveQuery(
  options: YamlConfig.LiveQueryConfig & {
    log: Logger;
    pubsub?: PubSub;
  },
): Plugin {
  if (!options.pubsub) {
    throw new Error('Live Query plugin requires a pubsub instance from Mesh/Gateway context');
  }
  options.log.debug(`Creating Live Query Store`);
  const liveQueryStore = new InMemoryLiveQueryStore({
    buildResourceIdentifier:
      options.resourceIdentifier != null
        ? function resourceIdentifierFactory({ typename, id }) {
            return stringInterpolator.parse(options.resourceIdentifier, {
              typename,
              id,
              env: process.env,
            });
          }
        : defaultResourceIdentifierNormalizer,
    includeIdentifierExtension:
      options.includeIdentifierExtension != null
        ? options.includeIdentifierExtension
        : process.env.DEBUG === '1',
    idFieldName: options.idFieldName,
    indexBy: options.indexBy,
  });
  const pubsub = options.pubsub;
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  fakePromise(
    pubsub.subscribe('live-query:invalidate', (identifiers: string | string[]) =>
      liveQueryStore.invalidate(identifiers),
    ),
  );
  return {
    onPluginInit({ addPlugin }) {
      addPlugin(useLiveQuery({ liveQueryStore }));
      if (options.invalidations?.length) {
        addPlugin(
          useInvalidateByResult({
            pubsub,
            invalidations: options.invalidations,
            log: options.log,
          }),
        );
      }
    },
  };
}
