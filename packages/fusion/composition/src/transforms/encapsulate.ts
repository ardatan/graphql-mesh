import type { GraphQLFieldConfigMap, OperationTypeNode } from 'graphql';
import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import type { SubgraphConfig, SubgraphTransform } from '../compose.js';
import { addInaccessibleDirective } from './filter-schema.js';

const OPERATION_TYPE_SUFFIX_MAP = {
  query: 'Query',
  mutation: 'Mutation',
  subscription: 'Subscription',
};

const DEFAULT_APPLY_TO = {
  query: true,
  mutation: true,
  subscription: true,
};

export interface EncapsulateTransformOpts {
  /**
   * Optional, name to use for grouping under the root types. If not specified, the API name is used.
   */
  name?: string;
  applyTo?: Record<OperationTypeNode, boolean>;
}

export function createEncapsulateTransform(opts: EncapsulateTransformOpts = {}): SubgraphTransform {
  return function encapsulateTransform(schema: GraphQLSchema, subgraphConfig: SubgraphConfig) {
    const groupName = opts.name || subgraphConfig.name;
    const applyToMap: Record<OperationTypeNode, boolean> = {
      ...DEFAULT_APPLY_TO,
      ...(opts.applyTo || {}),
    };
    const newRootTypes: Record<string, GraphQLObjectType> = {};
    for (const opTypeString in applyToMap) {
      const operationType = opTypeString as OperationTypeNode;
      const originalType = schema.getRootType(operationType);
      if (originalType && applyToMap[operationType]) {
        const originalTypeConfig = originalType.toConfig();
        const wrappedTypeName = `${groupName}${OPERATION_TYPE_SUFFIX_MAP[operationType]}`;
        const originalFieldMapWithHidden: GraphQLFieldConfigMap<any, any> = {};
        const wrappedFieldMap: GraphQLFieldConfigMap<any, any> = {};
        for (const fieldName in originalTypeConfig.fields) {
          const originalFieldConfig = originalTypeConfig.fields[fieldName];
          wrappedFieldMap[fieldName] = {
            ...originalFieldConfig,
            extensions: {
              directives: {
                resolveTo: [
                  {
                    sourceName: subgraphConfig.name,
                    sourceTypeName: originalType.name,
                    sourceFieldName: fieldName,
                  },
                ],
              },
            },
          };
          const newOriginalFieldConfig = {
            ...originalFieldConfig,
            astNode: undefined,
          };
          addInaccessibleDirective(newOriginalFieldConfig);
          originalFieldMapWithHidden[fieldName] = newOriginalFieldConfig;
        }
        const wrappedType = new GraphQLObjectType({
          name: wrappedTypeName,
          fields: wrappedFieldMap,
        });
        newRootTypes[operationType] = new GraphQLObjectType({
          ...originalTypeConfig,
          fields: {
            ...originalFieldMapWithHidden,
            [groupName]: {
              type: new GraphQLNonNull(wrappedType),
              extensions: {
                directives: {
                  resolveTo: [
                    {
                      sourceName: subgraphConfig.name,
                      sourceTypeName: originalType.name,
                      sourceFieldName: '__typename',
                    },
                  ],
                },
              },
            },
          },
        });
      } else {
        newRootTypes[operationType] = originalType;
      }
    }
    const schemaConfig = schema.toConfig();
    const newDirectives = [...schemaConfig.directives];
    if (!newDirectives.some(directive => directive.name === 'resolveTo')) {
      newDirectives.push(resolveToDirective);
    }
    return new GraphQLSchema({
      ...schemaConfig,
      types: undefined,
      directives: newDirectives,
      ...newRootTypes,
    });
  };
}

export const resolveToSourceArgsScalar = new GraphQLScalarType({
  name: 'ResolveToSourceArgs',
});

export const resolveToDirective = new GraphQLDirective({
  name: 'resolveTo',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    additionalArgs: { type: resolveToSourceArgsScalar },
    filterBy: { type: GraphQLString },
    keyField: { type: GraphQLString },
    keysArg: { type: GraphQLString },
    pubsubTopic: { type: GraphQLString },
    requiredSelectionSet: { type: GraphQLString },
    result: { type: GraphQLString },
    resultType: { type: GraphQLString },
    sourceArgs: { type: resolveToSourceArgsScalar },
    sourceFieldName: { type: GraphQLString },
    sourceName: { type: GraphQLString },
    sourceSelectionSet: { type: GraphQLString },
    sourceTypeName: { type: GraphQLString },
  },
});
