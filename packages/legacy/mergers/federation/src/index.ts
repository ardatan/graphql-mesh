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
import {
  applySchemaTransforms,
  extendSchemaPreservingExtensions,
  omitIntrospectionTypes,
} from '@graphql-mesh/utils';
import { addResolversToSchema } from '@graphql-tools/schema';
import {
  asArray,
  getDirectiveExtensions,
  mapSchema,
  printSchemaWithDirectives,
  type Executor,
} from '@graphql-tools/utils';
import { wrapSchema } from '@graphql-tools/wrap';

export type UnderthehoodOnSubgraphExecute = (
  subgraphName: string,
  executionRequest: Parameters<Executor>[0],
) => ReturnType<Executor>;

/**
 * Sole merger for legacy Mesh (breaking: `merger-stitching` / `merger-bare` removed).
 *
 * Sources → subgraphs like Mesh v2 (`composeSubgraphs`), then:
 * - `getMesh` / `createMeshHTTPHandler`: `handleFederationSupergraph` with in-process
 *   source executors; HTTP serve runs Hive Gateway under the hood on the Supergraph SDL.
 * - Artifacts: emit Supergraph SDL for Hive Gateway (standard `@transport` resolution).
 *
 * Single-source passthrough (former bare) is kept for already-composed Supergraphs /
 * simple schemas that should not be re-composed as a subgraph.
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

    if (rawSources.length === 1 && !shouldComposeSingleSource(rawSources[0], typeDefs, resolvers)) {
      return this.handleSingleSourcePassthrough(context);
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
        // Prefer loader-stamped `@transport(location)` (compose also reads it).
        // Never invent mesh:// placeholders — Hive Gateway uses real transports.
        url: getTransportLocation(rawSource.schema) ?? getTransportLocation(schemaForCompose),
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

    const onSubgraphExecute: UnderthehoodOnSubgraphExecute = (subgraphName, executionRequest) => {
      const executor = resolveSourceExecutor(executorByName, subgraphName);
      if (!executor) {
        throw new Error(
          `Legacy federation merger: no in-process executor for subgraph "${subgraphName}"`,
        );
      }
      return executor(executionRequest);
    };

    return this.buildExecutableFromSupergraphSdl({
      supergraphSdl,
      typeDefs,
      resolvers,
      sourceMap,
      onSubgraphExecute,
      subgraphCount: rawSources.length,
    });
  }

  private handleSingleSourcePassthrough({
    rawSources: [rawSource],
    typeDefs,
    resolvers,
  }: MeshMergerContext) {
    let schema = rawSource.schema;
    if (typeDefs.length > 0 || asArray(resolvers).length > 0) {
      for (const typeDef of typeDefs) {
        // graphql@16 extendSchema drops schema.extensions (Connectors @source/@link).
        schema = extendSchemaPreservingExtensions(schema, typeDef);
      }
      for (const resolversObj of asArray(resolvers)) {
        addResolversToSchema({
          schema,
          resolvers: resolversObj,
          updateResolversInPlace: true,
        });
      }
    }
    this.log.debug(`Single-source passthrough (federation merger)`);
    schema.extensions = schema.extensions || {};
    Object.defineProperty(schema.extensions, 'sourceMap', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: {
        get() {
          const nonExecutableSchema = mapSchema(schema);
          return applySchemaTransforms(
            nonExecutableSchema,
            rawSource,
            nonExecutableSchema,
            rawSource.transforms,
          );
        },
      },
    });
    // Already a Federation Supergraph (e.g. Supergraph handler): keep SDL for Gateway/artifacts.
    if (
      isLikelySupergraph(schema) &&
      !(schema.extensions as { supergraphSdl?: string }).supergraphSdl
    ) {
      (schema.extensions as { supergraphSdl?: string }).supergraphSdl =
        printSchemaWithDirectives(schema);
    }
    return {
      ...rawSource,
      schema,
    };
  }

  private buildExecutableFromSupergraphSdl(opts: {
    supergraphSdl: string;
    typeDefs: MeshMergerContext['typeDefs'];
    resolvers: MeshMergerContext['resolvers'];
    sourceMap: Map<RawSourceOutput, GraphQLSchema>;
    onSubgraphExecute: UnderthehoodOnSubgraphExecute;
    subgraphCount: number;
  }) {
    const unifiedGraph = buildSchema(opts.supergraphSdl, {
      assumeValid: true,
      assumeValidSDL: true,
    });

    const { unifiedGraph: executableUnifiedGraph } = handleFederationSupergraph({
      unifiedGraph,
      getUnifiedGraphSDL: () => opts.supergraphSdl,
      additionalTypeDefs: opts.typeDefs,
      additionalResolvers: opts.resolvers,
      onSubgraphExecute: opts.onSubgraphExecute,
      log: this.log,
    });

    const stitchedConfig = executableUnifiedGraph.toConfig();
    const unifiedSchema = new GraphQLSchema({
      ...stitchedConfig,
      types: omitIntrospectionTypes(stitchedConfig.types),
      assumeValid: true,
    });

    unifiedSchema.extensions = {
      ...executableUnifiedGraph.extensions,
      ...unifiedSchema.extensions,
      supergraphSdl: opts.supergraphSdl,
      onSubgraphExecute: opts.onSubgraphExecute,
    };
    Object.defineProperty(unifiedSchema.extensions, 'sourceMap', {
      enumerable: true,
      get: () => opts.sourceMap,
    });

    this.log.debug(`Under-the-hood supergraph is ready (${opts.subgraphCount} subgraph(s))`);
    return {
      schema: unifiedSchema,
    };
  }
}

function shouldComposeSingleSource(
  rawSource: RawSourceOutput,
  typeDefs: MeshMergerContext['typeDefs'],
  resolvers: MeshMergerContext['resolvers'],
): boolean {
  // Already a Supergraph document — do not re-compose as a subgraph.
  if (isLikelySupergraph(rawSource.schema)) {
    return false;
  }
  const hasAdditional = typeDefs.length > 0 || asArray(resolvers).length > 0;
  if (!hasAdditional) {
    return false;
  }
  // Former bare: compose when the source is wrapped/remote and extended.
  if (rawSource.executor || rawSource.transforms?.length) {
    return true;
  }
  // selectionSet additional resolvers need a federation execution plan.
  for (const resolversObj of asArray(resolvers)) {
    if (!resolversObj || typeof resolversObj !== 'object') continue;
    for (const typeName in resolversObj) {
      const fieldResolvers = (resolversObj as Record<string, unknown>)[typeName];
      if (!fieldResolvers || typeof fieldResolvers !== 'object') continue;
      for (const fieldName in fieldResolvers as object) {
        const fieldResolveObj = (fieldResolvers as Record<string, unknown>)[fieldName];
        if (
          fieldResolveObj &&
          typeof fieldResolveObj === 'object' &&
          (fieldResolveObj as { selectionSet?: unknown }).selectionSet != null
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function isLikelySupergraph(schema: GraphQLSchema): boolean {
  return schema.getType('join__Graph') != null;
}

function getTransportLocation(schema: GraphQLSchema): string | undefined {
  const transport = getDirectiveExtensions(schema)?.transport?.[0] as
    { location?: string } | undefined;
  return typeof transport?.location === 'string' && transport.location.length > 0
    ? transport.location
    : undefined;
}

function preserveSchemaDirectiveExtensions(from: GraphQLSchema, to: GraphQLSchema): GraphQLSchema {
  const fromDirs = (from.extensions as { directives?: Record<string, unknown> } | undefined)
    ?.directives;
  if (!fromDirs || typeof fromDirs !== 'object') {
    return to;
  }
  const extensions: Record<string, any> = (to.extensions ||= {});
  const existing =
    extensions.directives && typeof extensions.directives === 'object'
      ? { ...extensions.directives }
      : {};
  for (const [key, value] of Object.entries(fromDirs)) {
    if (existing[key] == null) {
      existing[key] = value;
    }
  }
  extensions.directives = existing;
  return to;
}

function getSchemaForCompose(rawSource: RawSourceOutput): GraphQLSchema {
  if (!rawSource.transforms?.length && rawSource.executor == null) {
    return rawSource.schema;
  }
  if (!rawSource.transforms?.length) {
    return rawSource.schema;
  }
  const wrapped = wrapSchema({
    schema: rawSource.schema,
    executor: rawSource.executor ?? createDefaultExecutor(rawSource.schema),
    transforms: rawSource.transforms,
    batch: rawSource.batch,
  });
  return preserveSchemaDirectiveExtensions(rawSource.schema, wrapped);
}

function getSourceExecutor(rawSource: RawSourceOutput, schemaForCompose: GraphQLSchema): Executor {
  if (rawSource.transforms?.length) {
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
  const lower = subgraphName.toLowerCase();
  for (const [name, executor] of executorByName) {
    if (name.toLowerCase() === lower) {
      return executor;
    }
  }
  return undefined;
}
