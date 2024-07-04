import type { GraphQLSchema } from 'graphql';
import { MapperKind } from '@graphql-tools/utils';
import type { SubgraphConfig, SubgraphTransform } from '../compose.js';
import { createRenameFieldTransform, createRenameTypeTransform } from './rename.js';

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
  includeRootOperations = false,
  includeTypes = true,
}: PrefixTransformConfig = {}) {
  return function prefixTransform(schema: GraphQLSchema, subgraphConfig: SubgraphConfig) {
    value = value || `${subgraphConfig.name}_`;
    const transforms: SubgraphTransform[] = [];
    if (includeRootOperations) {
      transforms.push(
        createRenameFieldTransform(({ typeName, fieldName }) => {
          if (ignore.includes(typeName) || ignore.includes(`${typeName}.${fieldName}`)) {
            return fieldName;
          }
          return `${value}${fieldName}`;
        }, MapperKind.ROOT_FIELD),
      );
    }
    if (includeTypes) {
      transforms.push(
        createRenameTypeTransform(({ typeName }) => {
          if (ignore.includes(typeName)) {
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
