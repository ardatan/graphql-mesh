import { isEnumType, type GraphQLSchema } from 'graphql';
import { process } from '@graphql-mesh/cross-helpers';
import type { TransportEntry } from '@graphql-mesh/transport-common';
import { getDirectiveExtensions } from '@graphql-mesh/utils';
import type { SubschemaConfig } from '@graphql-tools/delegate';
import { getStitchedSchemaFromSupergraphSdl } from '@graphql-tools/federation';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import {
  asArray,
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
  const queryTypeExtensions = getDirectiveExtensions(queryType);
  const extraTypeDirectives: { name: string; directives: Record<string, any[]> }[] | undefined =
    queryTypeExtensions?.extraTypeDirective;
  const extraSchemaDefinitionDirectives: { directives: Record<string, any[]> }[] | undefined =
    queryTypeExtensions?.extraSchemaDefinitionDirective;
  const extraEnumValueDirectives:
    | { name: string; value: string; directives: Record<string, any[]> }[]
    | undefined = queryTypeExtensions?.extraEnumValueDirective;
  if (
    extraTypeDirectives?.length ||
    extraSchemaDefinitionDirectives?.length ||
    extraEnumValueDirectives?.length
  ) {
    const extraTypeDirectiveMap = new Map<string, Record<string, any[]>>();
    if (extraTypeDirectives) {
      for (const { name, directives } of extraTypeDirectives) {
        extraTypeDirectiveMap.set(name, directives);
      }
    }
    const extraEnumValueDirectiveMap = new Map<string, Map<string, Record<string, any[]>>>();
    if (extraEnumValueDirectives) {
      for (const { name, value, directives } of extraEnumValueDirectives) {
        let enumValueDirectivesMap = extraEnumValueDirectiveMap.get(name);
        if (!enumValueDirectivesMap) {
          enumValueDirectivesMap = new Map();
          extraEnumValueDirectiveMap.set(name, enumValueDirectivesMap);
        }
        enumValueDirectivesMap.set(value, directives);
      }
    }
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
                extraTypeDirective: [],
                extraSchemaDefinitionDirective: [],
                extraEnumValueDirective: [],
              },
            },
            // Cleanup ASTNode to prevent conflicts
            astNode: undefined,
          });
        }
        const extraDirectives = extraTypeDirectiveMap.get(type.name);
        if (extraDirectives) {
          for (const directiveName in extraDirectives) {
            const extraDirectiveArgs = extraDirectives[directiveName];
            if (extraDirectiveArgs?.length) {
              typeDirectiveExtensions[directiveName] ||= [];
              typeDirectiveExtensions[directiveName].push(...extraDirectiveArgs);
            }
          }
          return new TypeCtor({
            ...type.toConfig(),
            extensions: {
              ...(type.extensions || {}),
              directives: typeDirectiveExtensions,
            },
            // Cleanup ASTNode to prevent conflicts
            astNode: undefined,
          });
        }
      },
      [MapperKind.ENUM_VALUE]: (valueConfig, typeName, schema, externalValue) => {
        const enumValueDirectivesMap = extraEnumValueDirectiveMap.get(typeName);
        if (enumValueDirectivesMap) {
          const enumValueDirectives = enumValueDirectivesMap.get(externalValue);
          if (enumValueDirectives) {
            const valueDirectives = getDirectiveExtensions(valueConfig) || {};
            for (const directiveName in enumValueDirectives) {
              const extraDirectives = enumValueDirectives[directiveName];
              if (extraDirectives?.length) {
                valueDirectives[directiveName] ||= [];
                valueDirectives[directiveName].push(...extraDirectives);
              }
            }
            return {
              ...valueConfig,
              extensions: {
                ...(valueConfig.extensions || {}),
                directives: valueDirectives,
              },
            };
          }
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
        additionalResolvers,
        stitchingDirectivesTransformer,
        onSubgraphExecute,
      }),
    onStitchingOptions(opts: any) {
      subschemas = opts.subschemas;
      opts.typeDefs = [opts.typeDefs, additionalTypeDefs];
      opts.resolvers = additionalResolvers;
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
