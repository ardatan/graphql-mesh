import type { Plugin } from '@envelop/core';
import { useLiveQuery } from '@envelop/live-query';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { toMeshPubSub, type HivePubSub, type MeshPubSub, type YamlConfig } from '@graphql-mesh/types';
import { PubSub } from '@graphql-mesh/utils';
import {
  defaultResourceIdentifierNormalizer,
  InMemoryLiveQueryStore,
} from '@n1ru4l/in-memory-live-query-store';
import { useInvalidateByResult } from './useInvalidateByResult.js';
import { Logger } from '@graphql-hive/logger';

export default function useMeshLiveQuery(
  options: {
    log?: Logger;
    pubsub?: MeshPubSub | HivePubSub;
  } & YamlConfig.LiveQueryConfig,
): Plugin {
  options.log ||= new Logger();
  options.pubsub ||= new PubSub();
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
  const pubsub = toMeshPubSub(options.pubsub);
  pubsub.subscribe('live-query:invalidate', (identifiers: string | string[]) =>
    liveQueryStore.invalidate(identifiers),
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
