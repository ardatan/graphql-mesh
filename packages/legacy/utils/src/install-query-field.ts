import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  isListType,
  isNonNullType,
  type GraphQLFieldConfig,
  type GraphQLNamedType,
  type GraphQLOutputType,
  type GraphQLSchema,
} from 'graphql';

/**
 * Rewire output types that point at `from` to `to` (Query self-references).
 * Used when rebuilding Query to add Federation `_entities` on GraphQL 17 so
 * `schema.toConfig()` does not see two types named `Query`.
 */
function rewireOutputType(
  type: GraphQLOutputType,
  from: GraphQLNamedType,
  to: GraphQLNamedType,
): GraphQLOutputType {
  if (type === from) {
    return to as GraphQLOutputType;
  }
  if (isNonNullType(type)) {
    return new GraphQLNonNull(rewireOutputType(type.ofType, from, to));
  }
  if (isListType(type)) {
    return new GraphQLList(rewireOutputType(type.ofType as GraphQLOutputType, from, to));
  }
  return type;
}

/**
 * Install (or re-bind resolve on) a root Query field in place.
 *
 * GraphQL 17 requires real `GraphQLField` instances (`toConfig`). Rebuilding
 * Query via `toConfig()` leaves self-references (`Query.self: Query`) pointed
 * at the old Query object — remap those to the replacement so a later
 * `new GraphQLSchema(schema.toConfig())` does not throw duplicate-type errors.
 */
export function installQueryField(
  schema: GraphQLSchema,
  fieldName: string,
  fieldConfig: GraphQLFieldConfig<any, any>,
): void {
  const queryType = schema.getQueryType();
  if (!queryType) {
    return;
  }
  const typeMap = schema.getTypeMap() as Record<string, GraphQLNamedType>;
  const existing = queryType.getFields()[fieldName];
  if (existing) {
    existing.resolve = fieldConfig.resolve;
    return;
  }

  const baseFields = queryType.toConfig().fields;
  let newQuery: GraphQLObjectType;
  newQuery = new GraphQLObjectType({
    ...queryType.toConfig(),
    fields: () => {
      const fields = { ...baseFields, [fieldName]: fieldConfig };
      const out: typeof fields = {};
      for (const [name, field] of Object.entries(fields)) {
        if (!field) continue;
        out[name] = {
          ...field,
          type: rewireOutputType(field.type as GraphQLOutputType, queryType, newQuery),
        };
      }
      return out;
    },
  });
  typeMap[newQuery.name] = newQuery;
  (schema as unknown as { _queryType?: GraphQLObjectType })._queryType = newQuery;
}
