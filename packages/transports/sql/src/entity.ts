import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  isObjectType,
  type GraphQLField,
  type GraphQLNamedType,
  type GraphQLResolveInfo,
  type GraphQLSchema,
} from 'graphql';
import { entitiesResolver } from '@apollo/subgraph';
import { getDefDirectives, installQueryField } from '@graphql-mesh/utils';
import { fakePromise } from '@whatwg-node/promise-helpers';

type ResolveReferenceFn = (reference: any, context: any, info: GraphQLResolveInfo) => any;

/**
 * Record `__resolveReference` the way `@apollo/subgraph` expects
 * (`extensions.apollo.subgraph.resolveReference`) so we can reuse
 * `entitiesResolver` instead of maintaining our own `_entities` dispatch.
 * Also mirror on `type.resolveReference` for Hive stub hydration helpers / tests.
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

type JoinDirectiveArgs = { name?: string; args?: Record<string, unknown> };

/** Raw `@sql` plus composed `@join__directive(name: "sql")` payloads. */
export function getSqlDirectiveArgs(
  schema: GraphQLSchema,
  node: {
    astNode?: unknown;
    extensions?: unknown;
  },
): Record<string, unknown>[] {
  const fromDef = getDefDirectives(schema, node as any)
    .filter(d => d.name === 'sql')
    .map(d => d.args || {});
  const joins = (node.extensions as any)?.directives?.join__directive as
    JoinDirectiveArgs[] | undefined;
  const fromJoin: Record<string, unknown>[] = [];
  if (Array.isArray(joins)) {
    for (const join of joins) {
      if (join?.name === 'sql' && join.args && typeof join.args === 'object') {
        fromJoin.push(join.args);
      }
    }
  }
  const rootJoins = (node.extensions as any)?.join__directive as JoinDirectiveArgs[] | undefined;
  if (Array.isArray(rootJoins)) {
    for (const join of rootJoins) {
      if (join?.name === 'sql' && join.args && typeof join.args === 'object') {
        fromJoin.push(join.args);
      }
    }
  }
  return [...fromDef, ...fromJoin];
}

const MESH_ENTITY_FILL = Symbol.for('mesh.sql.entityFill');
/** Marks stub hydrators so Postgres Grafast attribute plans can still install. */
export const MESH_ENTITY_HYDRATOR = Symbol.for('mesh.sql.entityHydrator');

/**
 * For types with `resolveReference`, resolve missing fields by fetching the entity
 * once per parent object (deduped). Lets Hive honor entity stubs the way Router does.
 */
function hydrateEntityStubFieldResolvers(schema: GraphQLSchema) {
  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type) || type.name.startsWith('__')) {
      continue;
    }
    const resolveReference = getTypeResolveReference(type);
    if (!resolveReference) {
      continue;
    }
    const fields = type.getFields();
    for (const fieldName of Object.keys(fields)) {
      const field = fields[fieldName] as GraphQLField<any, any>;
      if (typeof field.resolve === 'function') {
        continue;
      }
      const resolve = (parent: any, _args: any, context: any, info: any) => {
        if (parent == null || typeof parent !== 'object') {
          return parent?.[fieldName];
        }
        if (Object.prototype.hasOwnProperty.call(parent, fieldName)) {
          return parent[fieldName];
        }
        let fill = (parent as any)[MESH_ENTITY_FILL];
        if (!fill) {
          fill = fakePromise(resolveReference(parent, context, info)).then((full: any) => {
            if (full && typeof full === 'object') {
              Object.assign(parent, full);
            }
            return parent;
          });
          (parent as any)[MESH_ENTITY_FILL] = fill;
        }
        return fill.then((full: any) => full?.[fieldName]);
      };
      (resolve as any)[MESH_ENTITY_HYDRATOR] = true;
      field.resolve = resolve;
    }
  }
}

/**
 * Add / repair Federation `Query._entities` (same contract as Connectors REST transport).
 */
function ensureFederationEntitiesField(schema: GraphQLSchema): GraphQLSchema {
  const queryType = schema.getQueryType();
  if (!queryType) {
    return schema;
  }
  const entityTypes = Object.values(schema.getTypeMap()).filter(
    (t): t is GraphQLObjectType =>
      isObjectType(t) && !t.name.startsWith('__') && !!getTypeResolveReference(t),
  );
  if (!entityTypes.length) {
    return schema;
  }

  const typeMap = schema.getTypeMap() as Record<string, any>;
  let anyType = typeMap._Any as GraphQLScalarType | undefined;
  if (!anyType) {
    anyType = new GraphQLScalarType({
      name: '_Any',
      serialize: value => value,
      parseValue: value => value,
    });
    typeMap._Any = anyType;
  }

  let entityUnion = typeMap._Entity as GraphQLUnionType | undefined;
  if (!entityUnion) {
    entityUnion = new GraphQLUnionType({
      name: '_Entity',
      types: entityTypes,
      resolveType(obj) {
        return obj?.__typename || undefined;
      },
    });
    typeMap._Entity = entityUnion;
  }

  const entitiesResolve = (
    _root: unknown,
    args: { representations?: unknown },
    context: any,
    info: GraphQLResolveInfo,
  ) => {
    const representations = args?.representations;
    if (!Array.isArray(representations)) {
      return [];
    }
    return entitiesResolver({ representations, context, info });
  };

  return installQueryField(schema, '_entities', {
    description: 'Federation entity resolver for SQL transport (Hive `_entities` path)',
    type: new GraphQLNonNull(new GraphQLList(entityUnion)),
    args: {
      representations: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(anyType))),
        // GraphQL 17 requires `default`; GraphQL 16 only knows `defaultValue`.
        default: undefined,
        extensions: Object.create(null),
      } as any,
    },
    resolve: entitiesResolve,
    extensions: Object.create(null),
  });
}

export type TypeLevelSqlExecutor = (
  sqlArgs: Record<string, unknown>,
  reference: any,
  context: any,
  info: GraphQLResolveInfo,
) => any;

/**
 * Wire Federation entity resolution from type-level `@sql` (Connectors type-level pattern).
 * Query `entity: true` is no longer used — presence of OBJECT `@sql` is the signal.
 */
export function wireSqlEntityResolvers(
  schema: GraphQLSchema,
  opts: { executeTypeLevelRow: TypeLevelSqlExecutor },
): GraphQLSchema {
  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type) || type.name.startsWith('__')) continue;
    if (getTypeResolveReference(type)) continue;
    const sqlArgsList = getSqlDirectiveArgs(schema, type as any);
    if (!sqlArgsList.length) continue;
    const sqlArgs = sqlArgsList[0];
    const kind = (sqlArgs.kind as string) || 'ROW';
    if (kind !== 'ROW') continue;

    setTypeResolveReference(type, (reference, context, info) =>
      opts.executeTypeLevelRow(sqlArgs, reference, context, info),
    );
  }

  schema = ensureFederationEntitiesField(schema);
  hydrateEntityStubFieldResolvers(schema);
  return schema;
}
