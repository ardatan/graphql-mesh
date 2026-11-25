import { isIntrospectionType, type GraphQLNamedType } from 'graphql';

/**
 * Drop introspection types from a `GraphQLSchema.toConfig().types` list before
 * rebuilding with `new GraphQLSchema({ ...config, types })`.
 *
 * GraphQL 17 includes `__Schema` / `__Type` / … in `toConfig().types`, and the
 * constructor always re-adds its own introspection set. When the config types
 * and the constructor come from different graphql module instances (CJS↔ESM
 * under tsx, or duplicate installs), object identity diverges and construction
 * throws `multiple types named "__Schema"`.
 *
 * Filter by name (and `isIntrospectionType` when the same instance recognizes
 * them) so rebuilds stay safe across GraphQL 16/17 and dual package loads.
 */
export function omitIntrospectionTypes<T extends GraphQLNamedType>(types: readonly T[]): T[] {
  return types.filter(type => !type.name.startsWith('__') && !isIntrospectionType(type));
}
