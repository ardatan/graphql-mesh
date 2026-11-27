import { buildSchema, GraphQLSchema } from 'graphql';
import { type Logger } from '@graphql-hive/logger';
import { composeSubgraphs, type SubgraphConfig } from '@graphql-mesh/fusion-composition';
import { handleFederationSupergraph } from '@graphql-mesh/fusion-runtime';
import { createDefaultExecutor } from '@graphql-mesh/transport-common';
import type {
  MeshMerger,
  MeshMergerContext,
  MeshMergerOptions,
  RawSourceOutput,
} from '@graphql-mesh/types';
import { omitIntrospectionTypes } from '@graphql-mesh/utils';
import type { Executor } from '@graphql-tools/utils';
import { wrapSchema } from '@graphql-tools/wrap';

/**
 * Default multi-source merger for legacy Mesh.
 *
 * Composes sources into a federation/join-style supergraph (Mesh compose) and
 * consumes that supergraph with in-process subgraph executors, so `.meshrc` /
 * `getMesh` / `createMeshHTTPHandler` keep working while the runtime path matches
 * Compose + Hive Gateway.
 *
 * Classic `stitchSchemas` is no longer used — composition errors surface so
 * sources/transforms can be fixed for federation.
 */
export default class FederationMerger implements MeshMerger {
  name = 'federation';
  private log: Logger;
  constructor(options: MeshMergerOptions) {
    this.log = options.log;
  }

  getUnifiedSchema(context: MeshMergerContext) {
    const { rawSources, typeDefs, resolvers } = context;
    if (rawSources.length === 0) {
      throw new Error('Federation merger requires at least one source');
    }

    this.log.debug(
      `Composing a supergraph under the hood from ${rawSources.length} legacy source(s)`,
    );

    const sourceMap = new Map<RawSourceOutput, GraphQLSchema>();
    const executorByName = new Map<string, Executor>();
    const subgraphs: SubgraphConfig[] = [];

    for (const rawSource of rawSources) {
      const schemaForCompose = getSchemaForCompose(rawSource);
      sourceMap.set(rawSource, schemaForCompose);
      executorByName.set(rawSource.name, getSourceExecutor(rawSource, schemaForCompose));
      subgraphs.push({
        name: rawSource.name,
        schema: schemaForCompose,
        // Placeholder join__graph URL; execution stays in-process via executors below.
        url: `mesh://legacy/${encodeURIComponent(rawSource.name)}`,
      });
    }

    const composed = composeSubgraphs(subgraphs);
    if (composed.errors?.length) {
      throw new AggregateError(
        composed.errors,
        `Failed to compose legacy Mesh sources into a supergraph; \n${composed.errors
          .map(e => `- ${e.message}`)
          .join('\n')}`,
      );
    }
    const supergraphSdl = composed.supergraphSdl;
    if (!supergraphSdl) {
      throw new Error('Failed to compose legacy Mesh sources into a supergraph: empty SDL');
    }

    const unifiedGraph = buildSchema(supergraphSdl, {
      assumeValid: true,
      assumeValidSDL: true,
    });

    const { unifiedGraph: executableUnifiedGraph } = handleFederationSupergraph({
      unifiedGraph,
      getUnifiedGraphSDL: () => supergraphSdl,
      additionalTypeDefs: typeDefs,
      additionalResolvers: resolvers,
      onSubgraphExecute(subgraphName, executionRequest) {
        const executor = resolveSourceExecutor(executorByName, subgraphName);
        if (!executor) {
          throw new Error(
            `Legacy federation merger: no in-process executor for subgraph "${subgraphName}"`,
          );
        }
        return executor(executionRequest);
      },
      log: this.log,
    });

    // GraphQL 17 toConfig() includes introspection types; rebuilding without
    // omitting them can throw `multiple types named "__Schema"` across dual packages.
    const stitchedConfig = executableUnifiedGraph.toConfig();
    const unifiedSchema = new GraphQLSchema({
      ...stitchedConfig,
      types: omitIntrospectionTypes(stitchedConfig.types),
      assumeValid: true,
    });

    unifiedSchema.extensions = {
      ...executableUnifiedGraph.extensions,
      ...unifiedSchema.extensions,
      // Raw join-style SDL for artifact writers / consumers that want the composed SG.
      supergraphSdl,
    };
    Object.defineProperty(unifiedSchema.extensions, 'sourceMap', {
      enumerable: true,
      get: () => sourceMap,
    });

    this.log.debug(`Under-the-hood supergraph is ready (${rawSources.length} subgraph(s))`);
    return {
      schema: unifiedSchema,
    };
  }
}

function getSchemaForCompose(rawSource: RawSourceOutput): GraphQLSchema {
  if (!rawSource.transforms?.length && rawSource.executor == null) {
    return rawSource.schema;
  }
  if (!rawSource.transforms?.length) {
    // Executor-only remote schema: compose against the client schema shape.
    return rawSource.schema;
  }
  // Bake wrap-transforms into a local schema for compose + in-process execution.
  // Do NOT pass Mesh `createProxyingResolver` — that delegates back into the
  // unified gateway and recurses under federation underthehood execution.
  return wrapSchema({
    schema: rawSource.schema,
    executor: rawSource.executor ?? createDefaultExecutor(rawSource.schema),
    transforms: rawSource.transforms,
    batch: rawSource.batch,
  });
}

function getSourceExecutor(rawSource: RawSourceOutput, schemaForCompose: GraphQLSchema): Executor {
  if (rawSource.transforms?.length) {
    // Transforms were baked into schemaForCompose via wrapSchema.
    return createDefaultExecutor(schemaForCompose);
  }
  if (rawSource.executor) {
    return rawSource.executor;
  }
  return createDefaultExecutor(rawSource.schema);
}

function resolveSourceExecutor(
  executorByName: Map<string, Executor>,
  subgraphName: string,
): Executor | undefined {
  const direct = executorByName.get(subgraphName);
  if (direct) {
    return direct;
  }
  // join__Graph / Guild may normalize names; fall back to case-insensitive match.
  const lower = subgraphName.toLowerCase();
  for (const [name, executor] of executorByName) {
    if (name.toLowerCase() === lower) {
      return executor;
    }
  }
  return undefined;
}
