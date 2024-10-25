import {
  isEnumType,
  Kind,
  parse,
  print,
  visit,
  type GraphQLSchema,
  type ObjectTypeDefinitionNode,
} from 'graphql';
import type { TransportEntry } from '@graphql-mesh/transport-common';
import type { YamlConfig } from '@graphql-mesh/types';
import { resolveAdditionalResolversWithoutImport } from '@graphql-mesh/utils';
import type { SubschemaConfig } from '@graphql-tools/delegate';
import { getStitchedSchemaFromSupergraphSdl } from '@graphql-tools/federation';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import {
  asArray,
  getDirectiveExtensions,
  getDocumentNodeFromSchema,
  MapperKind,
  mapSchema,
  memoize1,
  mergeDeep,
} from '@graphql-tools/utils';
import { filterHiddenPartsInSchema } from '../filterHiddenPartsInSchema.js';
import type { UnifiedGraphHandler } from '../unifiedGraphManager.js';
import { handleFederationSubschema } from './subgraph.js';

// Memoize to avoid re-parsing the same schema AST
// Workaround for unsupported directives on composition: restore extra directives
export const restoreExtraDirectives = memoize1(function restoreExtraDirectives(
  schema: GraphQLSchema,
) {
  const queryType = schema.getQueryType();
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
      for (const { directives } of extraSchemaDefinitionDirectives) {
        for (const directiveName in directives) {
          schemaDirectives[directiveName] ||= [];
          schemaDirectives[directiveName].push(...directives[directiveName]);
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

export const handleFederationSupergraph: UnifiedGraphHandler = function ({
  unifiedGraph,
  onSubgraphExecute,
  additionalTypeDefs: additionalTypeDefsFromConfig = [],
  additionalResolvers: additionalResolversFromConfig = [],
  transportEntryAdditions,
  batch = true,
}) {
  const additionalTypeDefs = [...asArray(additionalTypeDefsFromConfig)];
  const additionalResolvers = [...asArray(additionalResolversFromConfig)];
  const transportEntryMap: Record<string, TransportEntry> = {};
  let subschemas: SubschemaConfig[] = [];
  const stitchingDirectivesTransformer = getStitchingDirectivesTransformerForSubschema();
  unifiedGraph = restoreExtraDirectives(unifiedGraph);
  // Get Transport Information from Schema Directives
  const schemaDirectives = getDirectiveExtensions(unifiedGraph);
  // Workaround to get the real name of the subschema
  const realSubgraphNameMap = new Map<string, string>();
  const joinGraphType = unifiedGraph.getType('join__Graph');
  if (isEnumType(joinGraphType)) {
    for (const enumValue of joinGraphType.getValues()) {
      const enumValueDirectives = getDirectiveExtensions(enumValue);
      const joinGraphDirectives = enumValueDirectives?.join__graph;
      if (joinGraphDirectives?.length) {
        for (const joinGraphDirective of joinGraphDirectives) {
          realSubgraphNameMap.set(enumValue.name, joinGraphDirective.name);
        }
      }
    }
  }

  let executableUnifiedGraph = getStitchedSchemaFromSupergraphSdl({
    supergraphSdl: getDocumentNodeFromSchema(unifiedGraph),
    /**
     * This visits over the subgraph schema to get;
     * - Extra Type Defs and Resolvers (additionalTypeDefs & additionalResolvers)
     * - Transport Entries (transportEntryMap)
     * - Type Merging Configuration for the subgraph (subschemaConfig.merge)
     * - Set the executor for the subschema (subschemaConfig.executor)
     */
    onSubschemaConfig: subschemaConfig =>
      handleFederationSubschema({
        subschemaConfig,
        realSubgraphNameMap,
        schemaDirectives,
        transportEntryMap,
        additionalTypeDefs,
        stitchingDirectivesTransformer,
        onSubgraphExecute,
      }),
    batch,
    onStitchingOptions(opts: any) {
      subschemas = opts.subschemas;
      const mergedTypeDefs = mergeTypeDefs([opts.typeDefs, additionalTypeDefs]);
      visit(mergedTypeDefs, {
        [Kind.FIELD_DEFINITION](field, _key, _parent, _path, ancestors) {
          const fieldDirectives = getDirectiveExtensions<{
            resolveTo: YamlConfig.AdditionalStitchingResolverObject;
          }>({ astNode: field });
          const resolveToDirectives = fieldDirectives?.resolveTo;
          if (resolveToDirectives?.length) {
            const targetTypeName = (ancestors[ancestors.length - 1] as ObjectTypeDefinitionNode)
              .name.value;
            const targetFieldName = field.name.value;
            for (const resolveToDirective of resolveToDirectives) {
              additionalResolvers.push(
                resolveAdditionalResolversWithoutImport({
                  targetTypeName,
                  targetFieldName,
                  ...resolveToDirective,
                }),
              );
            }
          }
        },
      });
      opts.typeDefs = mergedTypeDefs;
      opts.resolvers = additionalResolvers;
    },
    onSubgraphAST(_name, subgraphAST) {
      return visit(subgraphAST, {
        [Kind.OBJECT_TYPE_DEFINITION](node) {
          const typeName = node.name.value;
          return {
            ...node,
            fields: node.fields.filter(fieldNode => {
              const fieldDirectives = getDirectiveExtensions({ astNode: fieldNode });
              const resolveToDirectives = fieldDirectives.resolveTo;
              if (resolveToDirectives?.length > 0) {
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
              if (additionalFieldDirectives?.length > 0) {
                return false;
              }
              return true;
            }),
          };
        },
      });
    },
  });

  // Filter hidden elements with @hidden directive
  executableUnifiedGraph = filterHiddenPartsInSchema(executableUnifiedGraph);

  if (transportEntryAdditions) {
    const wildcardTransportOptions = transportEntryAdditions['*'];
    for (const subgraphName in transportEntryMap) {
      const toBeMerged: Partial<TransportEntry>[] = [];
      const transportEntry = transportEntryMap[subgraphName];
      if (transportEntry) {
        toBeMerged.push(transportEntry);
      }
      const transportOptionBySubgraph = transportEntryAdditions[subgraphName];
      if (transportOptionBySubgraph) {
        toBeMerged.push(transportOptionBySubgraph);
      }
      const transportOptionByKind = transportEntryAdditions['*.' + transportEntry?.kind];
      if (transportOptionByKind) {
        toBeMerged.push(transportOptionByKind);
      }
      if (wildcardTransportOptions) {
        toBeMerged.push(wildcardTransportOptions);
      }
      transportEntryMap[subgraphName] = mergeDeep(toBeMerged);
    }
  }
  return {
    unifiedGraph: executableUnifiedGraph,
    subschemas,
    transportEntryMap,
    additionalResolvers,
  };
};
