import {
  GraphQLObjectType,
  GraphQLSchema,
  isInterfaceType,
  isObjectType,
  type GraphQLNamedType,
} from 'graphql';
import { getDefDirectives } from '@graphql-mesh/utils';
import { MapperKind, mapSchema } from '@graphql-tools/utils';
import { getTypeResolveReference, setTypeResolveReference } from './lookup.js';

/**
 * Whether a named type is marked with Federation `@key` (object or interface).
 */
export function typeHasKeyDirective(schema: GraphQLSchema, type: GraphQLNamedType): boolean {
  return getDefDirectives(schema, type as any).some(d => d.name === 'key');
}

/**
 * Object types that participate in Federation `_entities`:
 * - have a `resolveReference`, or
 * - declare `@key`, or
 * - implement an interface that declares `@key`
 */
export function collectEntityObjectTypes(schema: GraphQLSchema): GraphQLObjectType[] {
  const keyedInterfaces = new Set<string>();
  for (const type of Object.values(schema.getTypeMap())) {
    if (isInterfaceType(type) && typeHasKeyDirective(schema, type)) {
      keyedInterfaces.add(type.name);
    }
  }

  const entities: GraphQLObjectType[] = [];
  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type) || type.name.startsWith('__')) {
      continue;
    }
    if (getTypeResolveReference(type) || typeHasKeyDirective(schema, type)) {
      entities.push(type);
      continue;
    }
    const interfaces = type.getInterfaces();
    if (interfaces.some(iface => keyedInterfaces.has(iface.name))) {
      entities.push(type);
    }
  }
  return entities;
}

/**
 * Map `TypeName: { __resolveReference }` from a resolvers map onto Apollo-style
 * `extensions.apollo.subgraph.resolveReference` (and the type mirror).
 *
 * `@graphql-tools/schema` `addResolversToSchema` does not install this itself.
 */
export function wireResolveReferenceFromResolvers(
  schema: GraphQLSchema,
  resolvers: Record<string, any>,
): void {
  for (const typeName of Object.keys(resolvers)) {
    const typeResolvers = resolvers[typeName];
    if (!typeResolvers || typeof typeResolvers !== 'object') {
      continue;
    }
    const resolveReference = typeResolvers.__resolveReference;
    if (typeof resolveReference !== 'function') {
      continue;
    }
    const type = schema.getType(typeName);
    if (!type || (!isObjectType(type) && !isInterfaceType(type))) {
      continue;
    }
    setTypeResolveReference(type, resolveReference);
  }
}

/**
 * Ensure the schema has a Query root so `_entities` / `_service` can be installed
 * when the SDL only declares entity types.
 */
export function ensureQueryRoot(schema: GraphQLSchema): GraphQLSchema {
  if (schema.getQueryType()) {
    return schema;
  }
  const query = new GraphQLObjectType({
    name: 'Query',
    fields: {},
  });
  const config = schema.toConfig();
  return new GraphQLSchema({
    ...config,
    query,
    types: [...config.types.filter(t => t.name !== 'Query'), query],
  });
}

/**
 * After `mapSchema` / `installQueryField`, re-attach `type.resolveReference`
 * mirrors from Apollo extensions.
 */
export function remirrorResolveReferences(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: type => {
      const fromExtensions = getTypeResolveReference(type);
      if (fromExtensions && (type as any).resolveReference !== fromExtensions) {
        (type as any).resolveReference = fromExtensions;
      }
      return type;
    },
  });
}
