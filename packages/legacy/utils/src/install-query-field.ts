import { GraphQLObjectType, type GraphQLFieldConfig, type GraphQLSchema } from 'graphql';
import { MapperKind, mapSchema } from '@graphql-tools/utils';

/**
 * Install (or re-bind resolve on) a root Query field.
 *
 * GraphQL 17 requires real `GraphQLField` instances (`toConfig`). Rebuilding
 * Query via a naive `toConfig()` + `typeMap` swap leaves references to the old
 * Query on other types (`Foo.query: Query`) and can throw duplicate-type errors
 * on `new GraphQLSchema(schema.toConfig())`.
 *
 * `mapSchema` rebuilds the whole graph so every reference — self and incoming —
 * points at the replacement Query.
 *
 * @returns the (possibly new) schema; callers must use the return value.
 */
export function installQueryField(
  schema: GraphQLSchema,
  fieldName: string,
  fieldConfig: GraphQLFieldConfig<any, any>,
): GraphQLSchema {
  const queryType = schema.getQueryType();
  if (!queryType) {
    return schema;
  }
  const existing = queryType.getFields()[fieldName];
  if (existing) {
    existing.resolve = fieldConfig.resolve;
    return schema;
  }

  return mapSchema(schema, {
    [MapperKind.QUERY]: type => {
      const config = type.toConfig();
      return new GraphQLObjectType({
        ...config,
        fields: {
          ...config.fields,
          [fieldName]: fieldConfig,
        },
      });
    },
  });
}
