import {
  DirectiveLocation,
  getNamedType,
  GraphQLDirective,
  GraphQLList,
  GraphQLNonNull,
  GraphQLSchema,
  GraphQLString,
  isLeafType,
  OperationTypeNode,
} from 'graphql';
import {
  asArray,
  getDirectiveExtensions,
  getRootTypeMap,
  MapperKind,
  mapSchema,
} from '@graphql-tools/utils';
import type { SubgraphTransform } from '../compose.js';
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
  // Type Level Directives

  /**
   * Designates an object type as an entity and specifies its key fields.
   * Key fields are a set of fields that a subgraph can use to uniquely identify any instance of the entity.
   *
   * [See Federation Spec](https://www.apollographql.com/docs/federation/federated-types/federated-directives/#key)
   */
  key?: FederationKeyDirectiveConfig | FederationKeyDirectiveConfig[];
  /**
   * Indicates that an object definition serves as an abstraction of another subgraph's entity interface.
   * This abstraction enables a subgraph to automatically contribute fields to all entities that implement a particular entity interface.
   * During composition, the fields of every `@interfaceObject` are added both to their corresponding interface definition and to all entity types that implement that interface.
   *
   * [Learn more about entity interfaces.](https://www.apollographql.com/docs/federation/federated-types/interfaces)
   */
  interfaceObject?: boolean;
  /**
   * Indicates that an object or interface definition is an extension of another definition of that same type.
   *
   * [See Federation spec](https://www.apollographql.com/docs/federation/federated-types/federated-directives/#extends)
   */
  extends?: boolean;

  // Field Level Directives

  /**
   * Indicates that an object type's field is allowed to be resolved by multiple subgraphs (by default in Federation 2, object fields can be resolved by only one subgraph).
   *
   * [See Federation spec](https://www.apollographql.com/docs/federation/federated-types/federated-directives/#shareable)
   */
  shareable?: boolean;
  /**
   * Indicates that a definition in the subgraph schema should be omitted from the router's API schema, even if that definition is also present in other subgraphs. This means that the field is not exposed to clients at all.
   *
   * [See Federation spec](https://www.apollographql.com/docs/federation/federated-types/federated-directives/#inaccessible)
   */
  inaccessible?: boolean;
  /**
   * Indicates that an object field is now resolved by this subgraph instead of another subgraph where it's also defined. This enables you to migrate a field from one subgraph to another.
   * You can apply @override to entity fields and fields of the root operation types (such as Query and Mutation).
   *
   * [See Federation spec](https://www.apollographql.com/docs/federation/federated-types/federated-directives/#override)
   */
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

  /**
   * Indicates that this subgraph usually can't resolve a particular object field, but it still needs to define that field for other purposes.
   *
   * [See Federation spec](https://www.apollographql.com/docs/federation/federated-types/federated-directives/#external)
   */
  external?: boolean;
  /**
   * Specifies a set of entity fields that a subgraph can resolve, but only at a particular schema path (at other paths, the subgraph can't resolve those fields).
   *
   * [See Federation spec](https://www.apollographql.com/docs/federation/federated-types/federated-directives/#provides)
   */
  provides?: {
    fields: string;
  };

  /**
   * Indicates that the resolver for a particular entity field depends on the values of other entity fields that are resolved by other subgraphs. This tells the router that it needs to fetch the values of those externally defined fields first, even if the original client query didn't request them.
   *
   * [See Federation spec](https://www.apollographql.com/docs/federation/federated-types/federated-directives/#requires)
   */
  requires?: {
    fields: string;
  };

  // Metadata

  /**
   * Applies arbitrary string metadata to a schema location. Custom tooling can use this metadata during any step of the schema delivery flow, including composition, static analysis, and documentation.
   *
   * [See Federation spec](https://www.apollographql.com/docs/federation/federated-types/federated-directives/#tag)
   */
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
  /**
   * A list of fields that together uniquely identify an instance of the entity.
   *
   * @example `id`
   */
  fields: string;
  /**
   * Define how to resolve the entity reference.
   */
  resolveReference?: FederationResolveReferenceConfig;
}

interface FederationResolveReferenceConfig {
  /**
   * The operation to use to resolve the reference.
   *
   * @example MUTATION
   * @default QUERY
   */
  operation?: OperationTypeNode;
  /**
   * The field to use to resolve the reference.
   *
   * @example getBookById
   */
  fieldName: string;

  /**
   * (WARNING: Advanced usage only)
   * Specifies the name of a field to pick off origin objects as the key value.
   * When omitted, a `@key` directive must be included on the return type’s definition to be built into an object key.
   * As you already defined the key fields in the key directive, you can omit the keyField in here.
   */
  keyField?: string;
  /**
   * Specifies which field argument receives the merge key.
   * This may be omitted for fields with only one argument where the recipient can be inferred.
   *
   * @example bookId
   */
  keyArg?: string;
  /**
   * Specifies a string of additional keys and values to apply to other arguments, formatted as `""" arg1: "value", arg2: "value" """`.
   */
  additionalArgs?: string;
  /**
   * (WARNING: Advanced usage only)
   * Allows building a custom key just for the argument from the `selectionSet` included by the `@key` directive.
   */
  key?: string[];
  /**
   * (WARNING: Advanced usage only)
   * This argument specifies a string expression that allows more customization of the input arguments.
   * Rules for evaluation of this argument are as follows:
   * - basic object parsing of the input key: `"arg1: $key.arg1, arg2: $key.arg2"`
   * - any expression enclosed by double brackets will be evaluated once for each of the requested keys, and then sent as a list: `"input: { keys: [[$key]] }"`
   * - selections from the key can be referenced by using the $ sign and dot notation: `"upcs: [[$key.upc]]"`, so that `$key.upc` refers to the upc field of the key.
   */
  argsExpr?: string;
}

interface MergeDirectiveConfig {
  key?: string[];
  keyField?: string;
  keyArg?: string;
  argsExpr?: string;
}

const federationDirectiveNames = [
  'key',
  'interfaceObject',
  'extends',
  'shareable',
  'inaccessible',
  'override',
  'authenticated',
  'requiresScopes',
  'policy',
  'external',
  'provides',
  'requires',
];

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
            for (const directiveConfig of directiveConfigs) {
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
                      ...keyConfig.resolveReference,
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
              usedFederationDirectives.add(`@${directiveName}`);
            }
          }
          for (const directiveName of federationDirectiveNames) {
            if (
              directiveExtensions[directiveName]?.length &&
              federationDirectiveNames.includes(directiveName)
            ) {
              usedFederationDirectives.add(`@${directiveName}`);
            }
          }
          // Existing directives
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
        const fieldDirectives = getDirectiveExtensions(fieldConfig) || {};
        const fieldTransformConfig = configurationByField.get(typeName)?.get(fieldName);
        if (fieldTransformConfig) {
          for (const directiveName in fieldTransformConfig) {
            const directiveConfigs = asArray(fieldTransformConfig[directiveName]);
            const specificDirectiveExtensions = (fieldDirectives[directiveName] ||= []);
            for (let directiveConfig of directiveConfigs) {
              if (typeof directiveConfig === 'boolean') {
                directiveConfig = {};
              }
              specificDirectiveExtensions.push(directiveConfig);
              usedFederationDirectives.add(`@${directiveName}`);
            }
          }
        }
        if (mergeDirectiveConfig) {
          const mergeDirectiveExtensions = (fieldDirectives.merge ||= []);
          let argsExpr = mergeDirectiveConfig.argsExpr;
          if (!argsExpr && fieldConfig.args && !mergeDirectiveConfig.keyArg) {
            const argsExprElems: string[] = [];
            const returnNamedType = getNamedType(fieldConfig.type);
            if ('getFields' in returnNamedType) {
              const returnFields = returnNamedType.getFields();
              for (const argName in fieldConfig.args) {
                const arg = fieldConfig.args[argName];
                const argType = getNamedType(arg.type);
                const returnField = returnFields[argName];
                if (returnField) {
                  const returnFieldType = getNamedType(returnField.type);
                  if (argType.name === returnFieldType.name) {
                    argsExprElems.push(`${argName}: $key.${argName}`);
                  }
                }
              }
              argsExpr = argsExprElems.join(', ');
            }
          }
          mergeDirectiveExtensions.push({
            subgraph: subgraphConfig.name,
            key: mergeDirectiveConfig.key,
            keyField: mergeDirectiveConfig.keyField,
            keyArg: mergeDirectiveConfig.keyArg,
            argsExpr,
          });
          mergeDirectiveUsed = true;
        }
        for (const directiveName of federationDirectiveNames) {
          if (
            fieldDirectives[directiveName]?.length &&
            federationDirectiveNames.includes(directiveName)
          ) {
            usedFederationDirectives.add(`@${directiveName}`);
          }
        }
        if (fieldTransformConfig || mergeDirectiveConfig) {
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
              usedFederationDirectives.add(`@${directiveName}`);
            }
          }
          for (const directiveName of federationDirectiveNames) {
            if (
              fieldDirectives[directiveName]?.length &&
              federationDirectiveNames.includes(directiveName)
            ) {
              usedFederationDirectives.add(`@${directiveName}`);
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
              argsExpr: {
                type: GraphQLString,
              },
              keyArg: {
                type: GraphQLString,
              },
              keyField: {
                type: GraphQLString,
              },
              key: {
                type: new GraphQLList(GraphQLString),
              },
              additionalArgs: {
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
