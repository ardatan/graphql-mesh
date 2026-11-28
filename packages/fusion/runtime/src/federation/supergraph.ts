import {
  Kind,
  parse,
  visit,
  type DocumentNode,
  type GraphQLSchema,
  type ObjectTypeDefinitionNode,
} from 'graphql';
import { LegacyLogger, Logger } from '@graphql-hive/logger';
import { type YamlConfig } from '@graphql-mesh/types';
import {
  getInContextSDK,
  getResolverForPubSubOperation,
  resolveAdditionalResolversWithoutImport,
  type PubSubOperationOptions,
} from '@graphql-mesh/utils';
import { createDefaultExecutor, type SubschemaConfig } from '@graphql-tools/delegate';
import { getStitchedSchemaFromSupergraphSdl } from '@graphql-tools/federation';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { getBackboneExecutor } from '@graphql-tools/stitch';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import {
  asArray,
  getDirectiveExtensions,
  getDocumentNodeFromSchema,
  MapperKind,
  mapSchema,
  memoize1,
  type IResolvers,
  type TypeSource,
} from '@graphql-tools/utils';
import { wrapExecutorWithPubsubPublish } from '../pubsubPublish.js';
import { getRealSubgraphNameMap } from '../realSubgraphNameMap.js';
import type { UnifiedGraphHandlerOpts, UnifiedGraphHandlerResult } from '../unifiedGraphManager.js';
import { compareSubgraphNames } from '../utils.js';
import { handleFederationSubschema } from './subgraph.js';

// Memoize to avoid re-parsing the same schema AST
// Workaround for unsupported directives on composition: restore extra directives
export const restoreExtraDirectives = memoize1(function restoreExtraDirectives(
  schema: GraphQLSchema,
) {
  const queryType = schema.getQueryType();
  if (!queryType) {
    throw new Error('Query type is required');
  }
  const queryTypeExtensions = getDirectiveExtensions<{
    extraSchemaDefinitionDirective?: { directives: Record<string, any[]> };
  }>(queryType);
  const extraSchemaDefinitionDirectives = queryTypeExtensions?.extraSchemaDefinitionDirective;
  if (extraSchemaDefinitionDirectives?.length) {
    schema = mapSchema(schema, {
      [MapperKind.TYPE]: type => {
        const typeDirectiveExtensions = getDirectiveExtensions(type) || {};
        const TypeCtor = Object.getPrototypeOf(type).constructor;
        if (type.name === queryType.name) {
          const typeConfig = type.toConfig();
          // Cleanup extra directives on Query type
          return new TypeCtor({
            ...typeConfig,
            extensions: {
              ...(type.extensions || {}),
              directives: {
                ...typeDirectiveExtensions,
                extraSchemaDefinitionDirective: [],
              },
            },
            // Cleanup ASTNode to prevent conflicts
            astNode: undefined,
          });
        }
      },
    });
    if (extraSchemaDefinitionDirectives?.length) {
      const schemaDirectives = getDirectiveExtensions(schema);
      for (const extensionObj of extraSchemaDefinitionDirectives) {
        if (extensionObj != null) {
          const { directives } = extensionObj;
          for (const directiveName in directives) {
            const directiveObjects = directives[directiveName];
            if (Array.isArray(directiveObjects)) {
              schemaDirectives[directiveName] ||= [];
              schemaDirectives[directiveName].push(...directiveObjects);
            }
          }
        }
      }
      const schemaExtensions: Record<string, unknown> = (schema.extensions ||= {});
      schemaExtensions.directives = schemaDirectives;
    }
  }
  return schema;
});

export function getStitchingDirectivesTransformerForSubschema() {
  const { stitchingDirectivesTransformer } = stitchingDirectives({
    keyDirectiveName: 'stitch__key',
    computedDirectiveName: 'stitch__computed',
    mergeDirectiveName: 'merge',
    canonicalDirectiveName: 'stitch__canonical',
  });
  return stitchingDirectivesTransformer;
}

/**
 * Resolve whether a named subgraph should forward `@defer`.
 * `true` enables all; a record enables by name (`"*"` is the default fallback).
 */
export function isSubgraphDeferEnabled(
  subgraphDefer: boolean | Record<string, boolean> | undefined,
  subgraphName: string | undefined,
): boolean {
  if (subgraphDefer == null) {
    return false;
  }
  if (typeof subgraphDefer === 'boolean') {
    return subgraphDefer;
  }
  if (subgraphName && Object.hasOwn(subgraphDefer, subgraphName)) {
    return subgraphDefer[subgraphName] === true;
  }
  if (Object.hasOwn(subgraphDefer, '*')) {
    return subgraphDefer['*'] === true;
  }
  return false;
}

// the @resolveTo directive definition, needed when additionalTypeDefs with @resolveTo are
// provided only at the gateway level and were never composed into the supergraph SDL
// TODO: same definition is also present in mesh, deduplicate and use the one from mesh
const RESOLVE_TO_DIRECTIVE_DEF: DocumentNode = parse(/* GraphQL */ `
  scalar ResolveToSourceArgs
  directive @resolveTo(
    requiredSelectionSet: String
    sourceName: String
    sourceTypeName: String
    sourceFieldName: String
    sourceSelectionSet: String
    sourceArgs: ResolveToSourceArgs
    keyField: String
    keysArg: String
    pubsubTopic: String
    filterBy: String
    additionalArgs: ResolveToSourceArgs
    result: String
    resultType: String
  ) on FIELD_DEFINITION
`);

export function handleResolveToDirectives(
  typeDefsOpt: TypeSource,
  additionalTypeDefs: TypeSource,
  additionalResolvers: IResolvers[],
) {
  let mergedTypeDefs = mergeTypeDefs([typeDefsOpt, additionalTypeDefs]);
  let resolveToUsed = false;
  let resolveToDirectiveDefined = false;
  visit(mergedTypeDefs, {
    [Kind.DIRECTIVE_DEFINITION](node) {
      if (node.name.value === 'resolveTo') {
        resolveToDirectiveDefined = true;
      }
    },
    [Kind.FIELD_DEFINITION](field, _key, _parent, _path, ancestors) {
      const fieldDirectives = getDirectiveExtensions<{
        resolveTo: YamlConfig.AdditionalStitchingResolverObject;
      }>({ astNode: field });
      const resolveToDirectives = fieldDirectives?.resolveTo;
      if (resolveToDirectives?.length) {
        resolveToUsed = true;
        const targetTypeName = (ancestors[ancestors.length - 1] as ObjectTypeDefinitionNode).name
          .value;
        const targetFieldName = field.name.value;
        for (const resolveToDirective of resolveToDirectives) {
          additionalResolvers.push(
            resolveAdditionalResolversWithoutImport({
              ...resolveToDirective,
              targetTypeName,
              targetFieldName,
            }),
          );
        }
      }
    },
  });
  // when @resolveTo is used in gateway-only additionalTypeDefs but was never composed into
  // the supergraph SDL, the directive definition is absent - inject it so stitchSchemas
  // validation doesn't fail
  if (resolveToUsed && !resolveToDirectiveDefined) {
    mergedTypeDefs = mergeTypeDefs([RESOLVE_TO_DIRECTIVE_DEF, mergedTypeDefs]);
  }
  return mergedTypeDefs;
}

export interface HandleFederationSupergraphResult extends UnifiedGraphHandlerResult {
  getSubschema(subgraphName: string): SubschemaConfig;
  subschemas: SubschemaConfig[];
}

export const handleFederationSupergraph = function ({
  unifiedGraph,
  onSubgraphExecute,
  onDelegateHooks,
  batchDelegateOptions,
  subgraphDefer,
  handleProgressiveOverride,
  additionalTypeDefs: additionalTypeDefsFromConfig = [],
  additionalResolvers: additionalResolversFromConfig = [],
  // no logger was provided, use a muted logger for consistency across plugin hooks
  log: rootLog = new Logger({ level: false }),
}: UnifiedGraphHandlerOpts): HandleFederationSupergraphResult {
  const additionalTypeDefs = [...asArray(additionalTypeDefsFromConfig)];
  const additionalResolvers = [...asArray(additionalResolversFromConfig)];
  let subschemas: SubschemaConfig[] = [];
  const stitchingDirectivesTransformer = getStitchingDirectivesTransformerForSubschema();
  const realSubgraphNameMap = getRealSubgraphNameMap(unifiedGraph);

  // register pubsub resolvers before stitching so local merged-type results get wrapped for hydration
  const subscriptionType = unifiedGraph.getSubscriptionType();
  if (subscriptionType) {
    for (const field of Object.values(subscriptionType.getFields())) {
      // the generic only projects the return type; the validated unified graph guarantees the directive args
      const pubsubOperations = getDirectiveExtensions<{
        pubsubOperation: PubSubOperationOptions;
      }>(field, unifiedGraph).pubsubOperation;
      if (pubsubOperations?.length) {
        const resolver: Record<string, unknown> = {};
        for (const pubsubOperationArgs of pubsubOperations) {
          Object.assign(resolver, getResolverForPubSubOperation(pubsubOperationArgs));
        }
        additionalResolvers.push({
          [subscriptionType.name]: { [field.name]: resolver },
        });
      }
    }
  }

  const unifiedGraphDirectives = getDirectiveExtensions(unifiedGraph);

  const executableUnifiedGraph = getStitchedSchemaFromSupergraphSdl({
    supergraphSdl: getDocumentNodeFromSchema(unifiedGraph),
    batchDelegateOptions,
    /**
     * This visits over the subgraph schema to get;
     * - Extra Type Defs and Resolvers (additionalTypeDefs & additionalResolvers)
     * - Transport Entries (transportEntryMap)
     * - Type Merging Configuration for the subgraph (subschemaConfig.merge)
     * - Set the executor for the subschema (subschemaConfig.executor)
     */
    onSubschemaConfig: subschemaConfig => {
      handleFederationSubschema({
        subschemaConfig,
        unifiedGraphDirectives,
        realSubgraphNameMap,
        additionalTypeDefs,
        stitchingDirectivesTransformer,
        onSubgraphExecute,
      });
      if (isSubgraphDeferEnabled(subgraphDefer, subschemaConfig.name)) {
        subschemaConfig.defer = true;
      }
    },
    onStitchingOptions(opts) {
      subschemas = opts.subschemas;
      opts.typeDefs = handleResolveToDirectives(
        opts.typeDefs,
        additionalTypeDefs,
        additionalResolvers,
      );
      opts.resolvers = additionalResolvers;
      opts.inheritResolversFromInterfaces = true;
    },
    onSubgraphAST(_name, subgraphAST) {
      return visit(subgraphAST, {
        [Kind.OBJECT_TYPE_DEFINITION](node) {
          const typeName = node.name.value;
          return {
            ...node,
            fields: node.fields?.filter(fieldNode => {
              const fieldDirectives = getDirectiveExtensions<{
                resolveTo: YamlConfig.AdditionalStitchingResolverObject;
                additionalField: {};
              }>({ astNode: fieldNode });
              const resolveToDirectives = fieldDirectives.resolveTo;
              if (resolveToDirectives?.length) {
                additionalTypeDefs.push({
                  kind: Kind.DOCUMENT,
                  definitions: [
                    {
                      kind: Kind.OBJECT_TYPE_DEFINITION,
                      name: { kind: Kind.NAME, value: typeName },
                      fields: [fieldNode],
                    },
                  ],
                });
              }
              const additionalFieldDirectives = fieldDirectives.additionalField;
              if (additionalFieldDirectives?.length) {
                return false;
              }
              return true;
            }),
          };
        },
      });
    },
    handleProgressiveOverride,
  });
  const inContextSDK = getInContextSDK(
    executableUnifiedGraph,
    // @ts-expect-error Legacy Mesh RawSource is not compatible with new Mesh
    subschemas,
    LegacyLogger.from(rootLog),
    onDelegateHooks || [],
  );
  function getSubschema(subgraphName: string): SubschemaConfig {
    const subgraph = subschemas.find(s => s.name && compareSubgraphNames(s.name, subgraphName));
    if (!subgraph) {
      throw new Error(`Subgraph ${subgraphName} not found`);
    }
    return subgraph;
  }
  const overrideLabels = executableUnifiedGraph.extensions?.overrideLabels as
    Set<string> | undefined;

  // @pubsubPublish is Mesh/fusion concern: wrap the backbone executor (do not
  // mapSchema Mutation fields - that replaces the schema and drops attach).
  const backboneOrSchema =
    getBackboneExecutor(executableUnifiedGraph) ?? createDefaultExecutor(executableUnifiedGraph);
  const executor = wrapExecutorWithPubsubPublish(executableUnifiedGraph, backboneOrSchema);

  return {
    unifiedGraph: executableUnifiedGraph,
    executor,
    inContextSDK,
    getSubgraphSchema(subgraphName) {
      const subschema = getSubschema(subgraphName);
      return subschema.schema;
    },
    getSubschema,
    subschemas,
    overrideLabels,
  };
};
