import { GraphQLNamedType, GraphQLSchema, GraphQLFieldConfig, isSpecifiedScalarType } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import { MapperKind, mapSchema, renameType } from '@graphql-tools/utils';

const rootOperations = new Set(['Query', 'Mutation', 'Subscription']);

export default class BarePrefix implements MeshTransform {
  noWrap = true;
  private ignoreList: string[];
  private includeRootOperations: boolean;
  private includeTypes: boolean;
  private prefix: string;

  constructor(options: MeshTransformOptions<YamlConfig.PrefixTransformConfig>) {
    const { apiName, config } = options;
    this.ignoreList = config.ignore || [];
    this.includeRootOperations = config.includeRootOperations === true;
    this.includeTypes = config.includeTypes !== false;
    this.prefix = null;

    if (config.value) {
      this.prefix = config.value;
    } else if (apiName) {
      this.prefix = `${apiName}_`;
    }

    if (!this.prefix) {
      throw new Error(`Transform 'prefix' has missing config: prefix`);
    }
  }

  transformSchema(schema: GraphQLSchema) {
    return mapSchema(schema, {
      [MapperKind.TYPE]: (type: GraphQLNamedType) => {
        if (this.includeTypes && !isSpecifiedScalarType(type)) {
          const currentName = type.name;
          if (!this.ignoreList.includes(currentName)) {
            return renameType(type, this.prefix + currentName);
          }
        }
        return undefined;
      },
      [MapperKind.ROOT_OBJECT]() {
        return undefined;
      },
      ...(this.includeRootOperations && {
        [MapperKind.COMPOSITE_FIELD]: (
          fieldConfig: GraphQLFieldConfig<any, any>,
          fieldName: string,
          typeName: string
        ) => {
          return !rootOperations.has(typeName) || // check we're in a root Type
            this.ignoreList.includes(typeName) || // check if type is to be ignored
            this.ignoreList.includes(`${typeName}.${fieldName}`) // check if field in type is to be ignored
            ? undefined // do not perform any change
            : [`${this.prefix}${fieldName}`, fieldConfig]; // apply prefix
        },
      }),
    });
  }
}
