import { GraphQLLiveDirectiveAST, useLiveQuery } from '@envelop/live-query';
import { MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { defaultResourceIdentifierNormalizer, InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store';
import { Plugin } from '@envelop/core';
import { useInvalidateByResult } from './useInvalidateByResult';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { extendSchema, GraphQLSchema, Kind } from 'graphql';

export default function useMeshLiveQuery(options: MeshPluginOptions<YamlConfig.LiveQueryConfig>): Plugin {
  options.logger.debug(`Creating Live Query Store`);
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
      options.includeIdentifierExtension != null ? options.includeIdentifierExtension : process.env.DEBUG === '1',
    idFieldName: options.idFieldName,
    indexBy: options.indexBy,
  });
  options.pubsub.subscribe('live-query:invalidate', (identifiers: string | string[]) =>
    liveQueryStore.invalidate(identifiers)
  );
  const replacedSchema = new WeakSet<GraphQLSchema>();
  return {
    onPluginInit({ addPlugin }) {
      options.logger.debug(`Creating Live Query Store`);
      const liveQueryStore = new InMemoryLiveQueryStore({
        includeIdentifierExtension: true,
      });
      addPlugin(useLiveQuery({ liveQueryStore }));
      if (options.invalidations?.length) {
        addPlugin(
          useInvalidateByResult({
            pubsub: options.pubsub,
            invalidations: options.invalidations,
            logger: options.logger,
          })
        );
      }
    },
    onSchemaChange({ schema, replaceSchema }) {
      if (replacedSchema.has(schema)) {
        return;
      }
      const newSchema = extendSchema(schema, {
        kind: Kind.DOCUMENT,
        definitions: [GraphQLLiveDirectiveAST],
      });
      replacedSchema.add(newSchema);
      replaceSchema(newSchema);
    },
  };
}
