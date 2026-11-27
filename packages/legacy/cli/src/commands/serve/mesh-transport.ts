import type { GraphQLSchema } from 'graphql';
import { compareSubgraphNames } from '@graphql-mesh/fusion-runtime';
import { createDefaultExecutor, type Transport } from '@graphql-mesh/transport-common';
import type { RawSourceOutput } from '@graphql-mesh/types';
import type { Executor } from '@graphql-tools/utils';
import { wrapSchema } from '@graphql-tools/wrap';

/**
 * In-process transport for under-the-hood supergraphs whose join URLs are
 * `mesh://legacy/<sourceName>`. Mirrors StitchingMerger's executor wiring so
 * Hive Gateway can feed the same supergraph without an HTTP hop to sources.
 */
export function createInProcessMeshTransport(rawSources: RawSourceOutput[]): Transport {
  const executorByName = new Map<string, Executor>();

  for (const rawSource of rawSources) {
    executorByName.set(rawSource.name, getSourceExecutor(rawSource));
  }

  return {
    getSubgraphExecutor({ subgraphName }) {
      for (const [name, executor] of executorByName) {
        if (compareSubgraphNames(name, subgraphName)) {
          return executor;
        }
      }
      throw new Error(
        `Legacy Mesh Hive Gateway serve: no in-process executor for subgraph "${subgraphName}"`,
      );
    },
  };
}

function getSourceExecutor(rawSource: RawSourceOutput): Executor {
  if (rawSource.transforms?.length) {
    const schemaForCompose = wrapSchema({
      schema: rawSource.schema,
      executor: rawSource.executor,
      transforms: rawSource.transforms,
      batch: rawSource.batch,
      createProxyingResolver: rawSource.createProxyingResolver,
      merge: rawSource.merge,
    });
    return createDefaultExecutor(schemaForCompose);
  }
  if (rawSource.executor) {
    return rawSource.executor;
  }
  return createDefaultExecutor(rawSource.schema as GraphQLSchema);
}
