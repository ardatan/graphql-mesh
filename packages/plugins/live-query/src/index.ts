import type { Plugin } from '@envelop/core';
import { useLiveQuery } from '@envelop/live-query';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { type HivePubSub, type YamlConfig } from '@graphql-mesh/types';
import { MemPubSub } from '@graphql-hive/pubsub';
import {
  defaultResourceIdentifierNormalizer,
  InMemoryLiveQueryStore,
} from '@n1ru4l/in-memory-live-query-store';
import { useInvalidateByResult } from './useInvalidateByResult.js';
import { Logger } from '@graphql-hive/logger';

export default function useMeshLiveQuery(
  options: {
    log?: Logger;
    pubsub?: HivePubSub;
  } & YamlConfig.LiveQueryConfig,
): Plugin {
  options.log ||= new Logger();
  options.pubsub ||= new MemPubSub();
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
  void Promise.resolve(
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
            invalidations: options.invalidations, log: options.log,
          }),
        );
      }
    },
  };
}
