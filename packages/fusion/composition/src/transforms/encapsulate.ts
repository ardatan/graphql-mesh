import {
  GraphQLFieldConfigMap,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  OperationTypeNode,
} from 'graphql';
import { SubgraphConfig, SubgraphTransform } from '../compose.js';
import { addHiddenDirective } from './filter-schema.js';

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
      if (applyToMap[operationType]) {
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
          addHiddenDirective(newOriginalFieldConfig);
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
    return new GraphQLSchema({
      ...schema.toConfig(),
      types: undefined,
      ...newRootTypes,
    });
  };
}
