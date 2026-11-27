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
import type { StitchingInfo } from '@graphql-tools/delegate';
import { stitchSchemas, ValidationLevel } from '@graphql-tools/stitch';
import type { Executor } from '@graphql-tools/utils';
import { wrapSchema } from '@graphql-tools/wrap';

/**
 * Default multi-source merger for legacy Mesh.
 *
 * Prefer composing sources into a federation/join-style supergraph (Mesh compose)
 * and consuming that supergraph with in-process subgraph executors, so `.meshrc` /
 * `getMesh` keep working while the runtime path matches Compose + Hive Gateway.
 *
 * When composition cannot represent a legacy graph (for example overlapping root
 * fields that Federation rejects), fall back to classic `stitchSchemas` so
 * existing configs keep running.
 */
export default class StitchingMerger implements MeshMerger {
  name = 'stitching';
  private log: Logger;
  constructor(options: MeshMergerOptions) {
    this.log = options.log;
  }

  getUnifiedSchema(context: MeshMergerContext) {
    const { rawSources } = context;
    if (rawSources.length === 0) {
      return this.getUnifiedSchemaViaStitch(context);
    }

    try {
      return this.getUnifiedSchemaViaSupergraph(context);
    } catch (err) {
      this.log.warn(
        `Under-the-hood supergraph composition failed; falling back to classic stitching.\n${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return this.getUnifiedSchemaViaStitch(context);
    }
  }

  private getUnifiedSchemaViaSupergraph(context: MeshMergerContext) {
    const { rawSources, typeDefs, resolvers } = context;
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
            `Legacy under-the-hood supergraph: no in-process executor for subgraph "${subgraphName}"`,
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

  private getUnifiedSchemaViaStitch(context: MeshMergerContext) {
    const { rawSources, typeDefs, resolvers } = context;
    this.log.debug(`Stitching the source schemas`);
    // Third-party schemas (e.g. GitHub) can violate GraphQL 17 rules such as
    // interface/implementation deprecation consistency. Handlers already load
    // with assumeValid; stitchSchemas' extendSchema path drops that flag, so
    // re-mark the unified schema (same approach as the bare merger).
    const stitchedSchema = stitchSchemas({
      subschemas: rawSources,
      typeDefs,
      resolvers,
      assumeValid: true,
      resolverValidationOptions: {
        requireResolversForAllFields: 'ignore',
        requireResolversForArgs: 'ignore',
        requireResolversForNonScalar: 'ignore',
        requireResolversForResolveType: 'ignore',
        requireResolversToMatchSchema: 'ignore',
      },
      typeMergingOptions: {
        validationSettings: {
          validationLevel: ValidationLevel.Off,
        },
      },
      mergeDirectives: true,
    });
    // GraphQL 17 toConfig() includes introspection types; rebuilding without
    // omitting them can throw `multiple types named "__Schema"` across dual packages.
    const stitchedConfig = stitchedSchema.toConfig();
    const unifiedSchema = new GraphQLSchema({
      ...stitchedConfig,
      types: omitIntrospectionTypes(stitchedConfig.types),
      assumeValid: true,
    });
    // stitchSchemas replaces extensions with stitchingInfo only — restore schema
    // directive apps (Connectors `@source` / `@link`) from subschemas.
    // Null prototype: a directive named `constructor` must not resolve
    // Object.prototype.constructor (spread would throw TypeError).
    const mergedSchemaDirectives = Object.assign(
      Object.create(null) as Record<string, unknown[]>,
      ((unifiedSchema.extensions as any)?.directives as Record<string, unknown[]>) || {},
    );
    for (const rawSource of rawSources) {
      const fromSub = (rawSource.schema.extensions as any)?.directives as
        Record<string, unknown[]> | undefined;
      if (!fromSub) continue;
      for (const [name, vals] of Object.entries(fromSub)) {
        const list = Array.isArray(vals) ? vals : [vals];
        mergedSchemaDirectives[name] = [...(mergedSchemaDirectives[name] || []), ...list];
      }
    }
    this.log.debug(`sourceMap is being generated and attached to the unified schema`);
    unifiedSchema.extensions = unifiedSchema.extensions || {};
    if (Object.keys(mergedSchemaDirectives).length) {
      (unifiedSchema.extensions as any).directives = mergedSchemaDirectives;
    }
    Object.assign(unifiedSchema.extensions, {
      sourceMap: new Proxy({} as any, {
        get: (_, pKey) => {
          if (pKey === 'get') {
            return (rawSource: RawSourceOutput) => {
              const stitchingInfo = unifiedSchema.extensions.stitchingInfo as StitchingInfo;
              for (const [subschemaConfig, subschema] of stitchingInfo.subschemaMap) {
                if ((subschemaConfig as RawSourceOutput).name === rawSource.name) {
                  return subschema.transformedSchema;
                }
              }
              return undefined;
            };
          }
          return () => {
            throw new Error('Not Implemented');
          };
        },
      }),
    });
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
  return wrapSchema({
    schema: rawSource.schema,
    executor: rawSource.executor,
    transforms: rawSource.transforms,
    batch: rawSource.batch,
    createProxyingResolver: rawSource.createProxyingResolver,
    merge: rawSource.merge,
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
