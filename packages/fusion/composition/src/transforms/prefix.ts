import type { GraphQLSchema } from 'graphql';
import { getRootTypeNames, MapperKind } from '@graphql-tools/utils';
import type { SubgraphConfig, SubgraphTransform } from '../compose.js';
import {
  createRenameFieldTransform,
  createRenameTypeTransform,
  ignoreList as defaultIgnoreList,
} from './rename.js';

const specifiedScalarNames = new Set(['Int', 'Float', 'String', 'Boolean', 'ID']);

export interface PrefixTransformConfig {
  /**
   * The prefix to apply to the schema types. By default it's the API name.
   */
  value?: string;
  /**
   * List of ignored types
   */
  ignore?: string[];
  /**
   * Protected custom scalars (e.g. from graphql-scalars) to still prefix.
   * GraphQL specified scalars (Int, Float, String, Boolean, ID) always stay unprefixed.
   */
  force?: string[];
  /**
   * Changes root types and changes the field names (default: false)
   */
  includeRootOperations?: boolean;
  /**
   * Changes types (default: true)
   */
  includeTypes?: boolean;
}

export function createPrefixTransform({
  value,
  ignore = [],
  force = [],
  includeRootOperations = false,
  includeTypes = true,
}: PrefixTransformConfig = {}) {
  return function prefixTransform(schema: GraphQLSchema, subgraphConfig: SubgraphConfig) {
    value = value || `${subgraphConfig.name}_`;
    const forceSet = new Set(force);
    const ignoreList = [
      ...ignore,
      // GraphQL specified scalars stay protected even when listed in `force`
      ...defaultIgnoreList.filter(
        typeName => specifiedScalarNames.has(typeName) || !forceSet.has(typeName),
      ),
    ];
    const transforms: SubgraphTransform[] = [];
    const rootTypes = getRootTypeNames(schema);
    if (includeRootOperations) {
      transforms.push(
        createRenameFieldTransform(({ typeName, fieldName }) => {
          if (
            ignoreList.includes(typeName) ||
            ignoreList.includes(`${typeName}.${fieldName}`) ||
            fieldName.startsWith('_encapsulated')
          ) {
            return fieldName;
          }
          return `${value}${fieldName}`;
        }, MapperKind.ROOT_FIELD),
      );
    }
    if (includeTypes) {
      transforms.push(
        createRenameTypeTransform(({ typeName }) => {
          if (rootTypes.has(typeName) || ignoreList.includes(typeName)) {
            return typeName;
          }
          return `${value}${typeName}`;
        }),
      );
    }
    for (const transform of transforms) {
      schema = transform(schema, subgraphConfig);
    }
    return schema;
  };
}
