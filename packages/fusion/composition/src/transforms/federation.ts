import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLNonNull,
  GraphQLSchema,
  GraphQLString,
  OperationTypeNode,
} from 'graphql';
import { getDirectiveExtensions } from '@graphql-mesh/utils';
import { asArray, getRootTypeMap, MapperKind, mapSchema } from '@graphql-tools/utils';
import { SubgraphTransform } from '../compose.js';
import {
  addFederation2DirectivesToSubgraph,
  importFederationDirectives,
  importMeshDirectives,
} from '../federation-utils.js';
import { TransformValidationError } from './utils.js';

export interface FederationTransformConfig {
  [schemaCoordinate: string]: FederationCoordinateConfig;
}

interface FederationCoordinateConfig {
  // Type Directives
  key?: FederationKeyDirectiveConfig | FederationKeyDirectiveConfig[];
  interfaceObject?: boolean;
  extends?: boolean;

  // Field Directives
  shareable?: boolean;
  inaccessible?: boolean;
  override?: {
    from: string;
  };

  // Access Control
  authenticated?: boolean;
  requiresScopes?: {
    scopes: [[string]];
  };
  policy?: {
    policies: [[string]];
  };

  // External field references
  external?: boolean;
  provides?: {
    fields: string;
  };
  requires?: {
    fields: string;
  };

  // Metadata
  tag?: {
    name: string;
  };

  // Context Managements
  context?: {
    name: string;
  };
  fromContext?: {
    field?: string;
  };
}

interface FederationKeyDirectiveConfig {
  fields: string;
  resolveReference?: FederationResolveReferenceConfig;
}

interface FederationResolveReferenceConfig {
  operation?: OperationTypeNode;
  fieldName: string;
  keyArg?: string;
}

interface MergeDirectiveConfig {
  keyField: string;
  keyArg?: string;
}

export function createFederationTransform(config: FederationTransformConfig): SubgraphTransform {
  return function (subgraphSchema, subgraphConfig) {
    const configurationByType = new Map<string, FederationCoordinateConfig>();
    const configurationByField = new Map<string, Map<string, FederationCoordinateConfig>>();
    for (const coordinate in config) {
      const [typeName, fieldName] = coordinate.split('.');
      const typeInSchema = subgraphSchema.getType(typeName);
      if (!typeInSchema) {
        throw new TransformValidationError(
          `Federation Transform: Type ${typeName} not found in schema for the coordinate: ${coordinate}`,
        );
      }
      if (fieldName) {
        if (!('getFields' in typeInSchema)) {
          throw new TransformValidationError(
            `Federation Transform: Type ${typeName} is not an object type in schema for the coordinate: ${coordinate}`,
          );
        }
        const fieldsInType = typeInSchema.getFields();
        if (!fieldsInType[fieldName]) {
          throw new TransformValidationError(
            `Federation Transform: Field ${fieldName} not found in type ${typeName} for the coordinate: ${coordinate}`,
          );
        }
        const fieldConfig = config[coordinate];
        let fieldMap = configurationByField.get(typeName);
        if (!fieldMap) {
          fieldMap = new Map();
          configurationByField.set(typeName, fieldMap);
        }
        fieldMap.set(fieldName, fieldConfig);
      } else {
        configurationByType.set(typeName, config[coordinate]);
      }
    }
    const mergeDirectiveConfigMap = new Map<OperationTypeNode, Map<string, MergeDirectiveConfig>>();
    const rootTypeNameOperationMap = new Map(
      [...getRootTypeMap(subgraphSchema)].map(([operationType, type]) => [
        type.name,
        operationType,
      ]),
    );
    const usedFederationDirectives = new Set<string>();
    let mergeDirectiveUsed = false;
    subgraphSchema = mapSchema(subgraphSchema, {
      [MapperKind.TYPE]: type => {
        const configByType = configurationByType.get(type.name);
        if (configByType) {
          const directiveExtensions = getDirectiveExtensions(type) || {};
          for (const directiveName in configByType) {
            const directiveConfigs = asArray(configByType[directiveName]);
            for (let directiveConfig of directiveConfigs) {
              const specificDirectiveExtensions = (directiveExtensions[directiveName] ||= []);
              switch (directiveName) {
                case 'key': {
                  const keyConfig = directiveConfig as FederationKeyDirectiveConfig;
                  specificDirectiveExtensions.push({
                    fields: keyConfig.fields,
                  });
                  if (keyConfig.resolveReference) {
                    const operation =
                      keyConfig.resolveReference.operation || OperationTypeNode.QUERY;
                    let operationMergeDirectiveConfig = mergeDirectiveConfigMap.get(operation);
                    if (!operationMergeDirectiveConfig) {
                      operationMergeDirectiveConfig = new Map();
                      mergeDirectiveConfigMap.set(operation, operationMergeDirectiveConfig);
                    }
                    operationMergeDirectiveConfig.set(keyConfig.resolveReference.fieldName, {
                      keyField: keyConfig.fields,
                      keyArg: keyConfig.resolveReference.keyArg,
                    });
                  }
                  break;
                }
                default: {
                  if (directiveConfig) {
                    specificDirectiveExtensions.push(
                      directiveConfig === true ? {} : directiveConfig,
                    );
                  }
                  break;
                }
              }
              usedFederationDirectives.add(directiveName);
            }
          }
          return new (Object.getPrototypeOf(type).constructor)({
            ...type.toConfig(),
            astNode: undefined,
            extensions: {
              ...(type.extensions || {}),
              directives: directiveExtensions,
            },
          });
        }
      },
      [MapperKind.ROOT_FIELD]: (fieldConfig, fieldName, typeName) => {
        const operation = rootTypeNameOperationMap.get(typeName);
        if (!operation) {
          throw new Error(`Unexpected root field ${fieldName} in type ${typeName}`);
        }
        const mergeDirectiveConfigForOperation = mergeDirectiveConfigMap.get(operation);
        const mergeDirectiveConfig = mergeDirectiveConfigForOperation?.get(fieldName);
        if (mergeDirectiveConfig) {
          const fieldDirectives = getDirectiveExtensions(fieldConfig) || {};
          const mergeDirectiveExtensions = (fieldDirectives.merge ||= []);
          mergeDirectiveExtensions.push({
            subgraph: subgraphConfig.name,
            keyField: mergeDirectiveConfig.keyField,
            keyArg: mergeDirectiveConfig.keyArg,
          });
          mergeDirectiveUsed = true;
          return {
            ...fieldConfig,
            astNode: undefined,
            extensions: {
              ...(fieldConfig.extensions || {}),
              directives: fieldDirectives,
            },
          };
        }
      },
      [MapperKind.FIELD]: (fieldConfig, fieldName, typeName) => {
        const fieldTransformConfig = configurationByField.get(typeName)?.get(fieldName);
        if (fieldTransformConfig) {
          const fieldDirectives = getDirectiveExtensions(fieldConfig) || {};
          for (const directiveName in fieldTransformConfig) {
            const directiveConfigs = asArray(fieldTransformConfig[directiveName]);
            const specificDirectiveExtensions = (fieldDirectives[directiveName] ||= []);
            for (let directiveConfig of directiveConfigs) {
              if (typeof directiveConfig === 'boolean') {
                directiveConfig = {};
              }
              specificDirectiveExtensions.push(directiveConfig);
              usedFederationDirectives.add(directiveName);
            }
          }
          return {
            ...fieldConfig,
            astNode: undefined,
            extensions: {
              ...(fieldConfig.extensions || {}),
              directives: fieldDirectives,
            },
          };
        }
      },
    });
    subgraphSchema = addFederation2DirectivesToSubgraph(subgraphSchema);
    subgraphSchema = importFederationDirectives(subgraphSchema, [...usedFederationDirectives]);
    if (mergeDirectiveUsed) {
      subgraphSchema = importMeshDirectives(subgraphSchema, ['@merge']);
      const schemaConfig = subgraphSchema.toConfig();
      subgraphSchema = new GraphQLSchema({
        ...schemaConfig,
        directives: [
          ...schemaConfig.directives,
          new GraphQLDirective({
            name: 'merge',
            locations: [DirectiveLocation.FIELD_DEFINITION],
            args: {
              subgraph: {
                type: new GraphQLNonNull(GraphQLString),
              },
              keyField: {
                type: GraphQLString,
              },
              keyArg: {
                type: GraphQLString,
              },
            },
          }),
        ],
      });
    }
    return subgraphSchema;
  };
}
