import type { GraphQLNamedType, GraphQLResolveInfo } from 'graphql';

export type ResolveReferenceFn = (reference: any, context: any, info: GraphQLResolveInfo) => any;

/**
 * Record `__resolveReference` the way `@apollo/subgraph` expects so
 * `entitiesResolver` can dispatch Federation `_entities`.
 */
export function setTypeResolveReference(
  type: GraphQLNamedType,
  resolveReference: ResolveReferenceFn,
) {
  const extensions = (type.extensions ??= {}) as Record<string, any>;
  const apollo = (extensions.apollo ??= {});
  const subgraph = (apollo.subgraph ??= {});
  subgraph.resolveReference = resolveReference;
  (type as any).resolveReference = resolveReference;
}

export function getTypeResolveReference(type: GraphQLNamedType): ResolveReferenceFn | undefined {
  const fromExtensions = (type.extensions as any)?.apollo?.subgraph?.resolveReference;
  if (typeof fromExtensions === 'function') {
    return fromExtensions;
  }
  const fromType = (type as any).resolveReference;
  return typeof fromType === 'function' ? fromType : undefined;
}
