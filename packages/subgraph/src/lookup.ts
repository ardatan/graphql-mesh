import {
  getNamedType,
  isListType,
  isNonNullType,
  isObjectType,
  type GraphQLField,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLResolveInfo,
  type GraphQLSchema,
} from 'graphql';
import { getDefDirectives } from '@graphql-mesh/utils';
import { getDirectiveExtensions } from '@graphql-tools/utils';

type ResolveReferenceFn = (reference: any, context: any, info: GraphQLResolveInfo) => any;

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

function unwrapOutputType(type: GraphQLField<any, any>['type']) {
  let t: any = type;
  while (isNonNullType(t) || isListType(t)) {
    t = t.ofType;
  }
  return t;
}

function isListOutput(type: GraphQLField<any, any>['type']): boolean {
  let t: any = type;
  while (isNonNullType(t)) {
    t = t.ofType;
  }
  return isListType(t);
}

interface LookupFieldInfo {
  field: GraphQLField<any, any>;
  /** Map entity representation field name → Query field argument name */
  representationToArg: Map<string, string>;
}

/**
 * Collect Query fields marked `@lookup` (Federation Spec draft).
 * List-returning fields are skipped: use Mesh `@merge` for list/batch entries.
 */
function collectLookupFields(schema: GraphQLSchema): Map<string, LookupFieldInfo> {
  const queryType = schema.getQueryType();
  const byType = new Map<string, LookupFieldInfo>();
  if (!queryType) {
    return byType;
  }

  for (const field of Object.values(queryType.getFields())) {
    const directives = getDefDirectives(schema, field as any);
    const hasLookup = directives.some(d => d.name === 'lookup');
    if (!hasLookup) {
      continue;
    }
    if (isListOutput(field.type)) {
      // Federation Spec `@lookup` is single-object only.
      continue;
    }
    const returnType = getNamedType(unwrapOutputType(field.type));
    if (!isObjectType(returnType)) {
      continue;
    }

    const representationToArg = new Map<string, string>();
    for (const arg of field.args) {
      const argDirectives = getDefDirectives(schema, arg as any);
      const isDir = argDirectives.find(d => d.name === 'is');
      const entityField =
        typeof isDir?.args?.field === 'string' && isDir.args.field.length
          ? isDir.args.field
          : arg.name;
      representationToArg.set(entityField, arg.name);
    }

    // First `@lookup` per return type wins (same convention as connect entity: true).
    if (!byType.has(returnType.name)) {
      byType.set(returnType.name, { field, representationToArg });
    }
  }
  return byType;
}

/**
 * Wire Federation Spec draft `@lookup` / `@is` into type-level
 * `resolveReference` callbacks used by `Query._entities`.
 *
 * `@internal` args/fields stay on the executable schema; callers that print
 * `_service { sdl }` should filter them (see {@link ensureFederationServiceField}).
 *
 * Does not remove or deprecate Mesh `@merge` list/batch entry fields.
 */
export function wireLookupEntityResolvers(schema: GraphQLSchema): GraphQLSchema {
  const lookupByType = collectLookupFields(schema);
  if (!lookupByType.size) {
    return schema;
  }

  for (const [typeName, info] of lookupByType) {
    const type = schema.getType(typeName);
    if (!type || !isObjectType(type)) {
      continue;
    }
    if (getTypeResolveReference(type)) {
      // Prefer an already-wired resolver (e.g. `@connect(entity: true)`).
      continue;
    }
    const { field, representationToArg } = info;
    setTypeResolveReference(type, (reference, context, infoArg) => {
      const args: Record<string, any> = {};
      for (const [entityField, argName] of representationToArg) {
        args[argName] = reference?.[entityField];
      }
      return field.resolve?.(null, args, context, infoArg);
    });
  }

  // Keep schema extensions markers for tests / tooling.
  const schemaDirectives = getDirectiveExtensions(schema) || {};
  (schema.extensions as any) = {
    ...(schema.extensions || {}),
    directives: schemaDirectives,
    meshLookupTypes: [...lookupByType.keys()],
  };

  return schema;
}
