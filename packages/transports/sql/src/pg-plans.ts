import { access, connection, context, lambda } from 'grafast';
import type { GraphQLFieldConfig, GraphQLSchema } from 'graphql';
import { getNamedType, isObjectType } from 'graphql';
import { getDefDirectives } from '@graphql-mesh/utils';
import { MapperKind, mapSchema } from '@graphql-tools/utils';
import { batchableEqualityColumn } from './batch.js';
import { MESH_ENTITY_HYDRATOR } from './entity.js';
import { parseSqlMapping } from './mapping.js';
import type { MeshPgRegistry } from './pg-registry.js';
import type { SqlKind, SqlMappingEntry } from './types.js';

/**
 * Attach Grafast / `@dataplan/pg` plan resolvers for `@sql` query fields.
 * Mutations keep traditional resolvers for this slice.
 *
 * Plans that cannot apply client filters / pagination keep the generic
 * GraphQL.js resolver from `getSqlExecutor` instead of a partial plan.
 */
export function wirePostgresSqlPlans(
  schema: GraphQLSchema,
  registry: MeshPgRegistry,
  meta: {
    relationNames: Map<string, Map<string, { remoteTable: string; kind: 'ROW' | 'ROWS' }>>;
    tableByType: Map<string, string>;
    /** Relations that `addRelation` actually installed (subset of relationNames). */
    installedRelations?: Map<string, Set<string>>;
    /** table → SQL column / gql key → GraphQL attribute name */
    sqlToAttrByTable?: Map<string, Map<string, string>>;
  },
): GraphQLSchema {
  // Types that may be produced by a bailed (generic-resolve) root must keep
  // generic child resolvers — relation plans need Pg step parents with
  // manyRelation/singleRelation, not plain objects.
  const typesWithGenericRootParent = collectTypesWithGenericRootParents(schema);

  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD](fieldConfig, fieldName, typeName) {
      const sqlDir = getDefDirectives(schema, fieldConfig).find(d => d.name === 'sql');
      const extensions = (fieldConfig.extensions ??= {}) as Record<string, any>;
      const grafast = (extensions.grafast ??= {});

      if (sqlDir) {
        const table = String(sqlDir.args.table || '');
        const kind = (sqlDir.args.kind || 'ROWS') as SqlKind;
        const resource = (registry.pgResources as any)[table];
        if (!resource) return fieldConfig;

        if (kind === 'INSERT' || kind === 'UPDATE' || kind === 'DELETE') {
          return fieldConfig;
        }

        const where = parseSqlMapping(sqlDir.args.where as string | undefined);
        const isRoot = typeName === 'Query' || typeName === 'Mutation';
        const relMeta = meta.relationNames.get(typeName)?.get(fieldName);

        if (!isRoot && relMeta && (kind === 'ROW' || kind === 'ROWS')) {
          // singleRelation / manyRelation only encode the installed `$this` join —
          // extra `$args` / fixed predicates / planners must keep the generic resolver.
          if (relationHasClientPlanners(sqlDir.args) || relationWhereTooComplexForPlan(where)) {
            return fieldConfig;
          }
          // Discovery metadata alone is not enough — addRelation may have been skipped
          // when there was no `$this` binder.
          if (!meta.installedRelations?.get(typeName)?.has(fieldName)) {
            return fieldConfig;
          }
          // ROWS / manyRelation need a Pg parent step. Types that may arrive as plain
          // objects from a bailed root keep the generic resolver for has-many fields.
          // ROW belongs-to can fall back to remoteResource.get via the local FK attr.
          if (kind === 'ROWS' && typesWithGenericRootParent.has(typeName)) {
            return fieldConfig;
          }
          const localTable = meta.tableByType.get(typeName);
          const localResource = localTable
            ? (registry.pgResources as Record<string, any>)[localTable]
            : undefined;
          const rel =
            typeof localResource?.getRelation === 'function'
              ? localResource.getRelation(fieldName)
              : localResource?.relations?.[fieldName];
          grafast.plan = makeRelationPlan(kind, fieldName, rel);
          delete (fieldConfig as GraphQLFieldConfig<any, any>).resolve;
          return fieldConfig;
        }

        if (kind === 'COUNT') {
          // Aggregate COUNT plans are not wired yet — keep generic resolver.
          return fieldConfig;
        }

        if (
          (kind === 'ROWS' || kind === 'CONNECTION') &&
          rootWhereNeedsGenericResolver(where, sqlDir.args)
        ) {
          return fieldConfig;
        }

        // ROW root: only a single `col: $args.x` equality is handled by resource.get.
        if (kind === 'ROW' && rowWhereTooComplexForGet(where)) {
          return fieldConfig;
        }

        const sqlToAttr = meta.sqlToAttrByTable?.get(table);
        const paginationArgs = paginationArgNames(sqlDir.args);
        grafast.plan = makeRootPlan(resource, kind, where, sqlToAttr, paginationArgs);
        delete (fieldConfig as GraphQLFieldConfig<any, any>).resolve;
        return fieldConfig;
      }

      // Column scalars on table types: `$row.get('id')` for Pg steps, `access` for
      // plain objects from a generic parent resolve (mixed GraphQL.js / Grafast).
      // Keep custom resolvers / plans (no `@sql` on the field). Entity stub
      // hydrators from `wireSqlEntityResolvers` are tagged and still get attribute
      // plans — otherwise Pg parents stay tuples and hydrators cannot read keys.
      // For tagged hydrators, the plan dual-paths: Pg `.get` vs lambda that still
      // runs the hydrator so plain-object federation stubs fill missing fields.
      const hydratorResolve =
        typeof fieldConfig.resolve === 'function' &&
        (fieldConfig.resolve as unknown as Record<symbol, unknown>)[MESH_ENTITY_HYDRATOR]
          ? fieldConfig.resolve
          : undefined;
      if (typeof fieldConfig.resolve === 'function' && !hydratorResolve) {
        return fieldConfig;
      }
      if ((fieldConfig.extensions as any)?.grafast?.plan) return fieldConfig;
      const parentTable = meta.tableByType.get(typeName);
      if (!parentTable) return fieldConfig;
      const parentResource = (registry.pgResources as any)[parentTable];
      const attrs = parentResource?.codec?.attributes;
      if (!attrs || !(fieldName in attrs)) return fieldConfig;

      grafast.plan = function sqlAttributePlan($row: any, _fieldArgs?: any, fieldInfo?: any) {
        if ($row && typeof $row.get === 'function') return $row.get(fieldName);
        if (hydratorResolve) {
          // Preserve planning-time FieldInfo for resolveReference (fieldName /
          // parentType / schema / fieldNodes). path / variableValues / rootValue
          // are filled at GraphQL resolve time when available; here we pass the
          // plan-time base so custom resolvers that read `info` still work.
          const resolveInfo = fieldInfo
            ? {
                fieldName: fieldInfo.fieldName ?? fieldName,
                fieldNodes: fieldInfo.fieldNodes ?? [],
                returnType: fieldInfo.field?.type,
                parentType: fieldInfo.parentType,
                schema: fieldInfo.schema,
                fragments: Object.create(null),
                rootValue: undefined,
                operation: undefined,
                variableValues: Object.create(null),
                path: { prev: undefined, key: fieldInfo.fieldName ?? fieldName },
              }
            : {
                fieldName,
                fieldNodes: [],
                returnType: undefined,
                parentType: undefined,
                schema: undefined,
                fragments: Object.create(null),
                rootValue: undefined,
                operation: undefined,
                variableValues: Object.create(null),
                path: { prev: undefined, key: fieldName },
              };
          return lambda([$row, context()], ([parent, ctx]: [any, any]) =>
            (hydratorResolve as any)(parent, {}, ctx, resolveInfo),
          );
        }
        return access($row, fieldName);
      };
      delete (fieldConfig as GraphQLFieldConfig<any, any>).resolve;
      return fieldConfig;
    },
  });
}

/** Object types returned by Query/Mutation roots that keep a generic resolver. */
function collectTypesWithGenericRootParents(schema: GraphQLSchema): Set<string> {
  const out = new Set<string>();
  const addNamedObject = (type: ReturnType<typeof getNamedType>) => {
    if (isObjectType(type)) out.add(type.name);
  };
  const addConnectionNode = (connectionType: ReturnType<typeof getNamedType>) => {
    if (!isObjectType(connectionType)) return;
    const nodesField = connectionType.getFields().nodes;
    if (nodesField) {
      addNamedObject(getNamedType(nodesField.type));
      return;
    }
    const edgesField = connectionType.getFields().edges;
    if (edgesField) {
      const edgeType = getNamedType(edgesField.type);
      if (isObjectType(edgeType)) {
        const nodeField = edgeType.getFields().node;
        if (nodeField) addNamedObject(getNamedType(nodeField.type));
      }
    }
  };
  const query = schema.getQueryType();
  const mutation = schema.getMutationType();
  for (const root of [query, mutation]) {
    if (!root) continue;
    for (const field of Object.values(root.getFields())) {
      const sqlDir = getDefDirectives(schema, field).find(d => d.name === 'sql');
      const named = getNamedType(field.type);
      if (!sqlDir) {
        // Hand-written roots that keep a GraphQL.js resolve still produce plain
        // object parents — nested `@sql` relations must stay generic.
        if (typeof field.resolve === 'function') {
          addNamedObject(named);
        }
        continue;
      }
      const kind = (sqlDir.args.kind || 'ROWS') as SqlKind;
      if (kind === 'INSERT' || kind === 'UPDATE' || kind === 'DELETE' || kind === 'COUNT') {
        continue;
      }
      const where = parseSqlMapping(sqlDir.args.where as string | undefined);
      const needsGeneric =
        (kind === 'ROWS' || kind === 'CONNECTION') &&
        rootWhereNeedsGenericResolver(where, sqlDir.args as Record<string, unknown>);
      const rowNeedsGeneric = kind === 'ROW' && rowWhereTooComplexForGet(where);
      if (!needsGeneric && !rowNeedsGeneric) continue;
      if (kind === 'CONNECTION') {
        addConnectionNode(named);
        continue;
      }
      addNamedObject(named);
    }
  }
  return out;
}

function relationHasClientPlanners(args: Record<string, unknown>): boolean {
  const where = String(args.where || '');
  if (where.includes('$args')) return true;
  for (const key of ['orderBy', 'limit', 'offset', 'first', 'after', 'filter'] as const) {
    if (args[key]) return true;
  }
  return false;
}

/** Relation plans only apply a single `$this` join — anything else drops filters. */
function relationWhereTooComplexForPlan(where: ReturnType<typeof parseSqlMapping>): boolean {
  let thisEquals = 0;
  for (const entry of where.entries) {
    if (entry.spread) return true;
    if (entry.children) continue;
    if (entry.key.startsWith('$')) {
      // bare `$args.where` / `$this.x` whole-value binders
      if (entry.value?.kind === 'args') return true;
      continue;
    }
    if (entry.value?.kind === 'this') {
      // Registry installs one attr pair from the first path segment only —
      // `$this.metadata.profileId` cannot be represented; keep generic.
      const segs = entry.value.path?.length
        ? entry.value.path
        : entry.value.value
          ? [entry.value.value]
          : [];
      if (segs.length !== 1) return true;
      thisEquals += 1;
      continue;
    }
    // `tenant_id: $args.tenantId`, fixed literals, etc.
    return true;
  }
  // Registry installs one local/remote attr pair; multi-predicate joins stay generic.
  return thisEquals !== 1;
}

function whereHasClientFilter(where: ReturnType<typeof parseSqlMapping>): boolean {
  return where.entries.some(
    (e: SqlMappingEntry) =>
      e.spread ||
      (e.key.startsWith('$') && e.value?.kind === 'args') ||
      (e.value?.kind === 'args' &&
        (e.value.value === 'where' ||
          e.value.value === 'filter' ||
          e.value.path?.[0] === 'where' ||
          e.value.path?.[0] === 'filter')),
  );
}

/** `$args.take` → `take`; exact `$args.<name>` only (null = unsupported form). */
function argsBinderName(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  const m = /^\$args\.([A-Za-z_][A-Za-z0-9_]*)$/.exec(String(raw).trim());
  return m ? m[1] : null;
}

/**
 * GraphQL arg names for pagination planners. Missing binder → default field name.
 * Unsupported binder forms are excluded (caller bails to generic via
 * `rootWhereNeedsGenericResolver`).
 */
function paginationArgNames(args: Record<string, unknown>): {
  limit?: string;
  offset?: string;
  first?: string;
  after?: string;
  last?: string;
  before?: string;
} {
  const out: Record<string, string> = {};
  for (const key of ['limit', 'offset', 'first', 'after', 'last', 'before'] as const) {
    const raw = args[key];
    if (raw == null || raw === '') {
      // No directive binder — plan reads the GraphQL arg of the same name when present.
      continue;
    }
    const name = argsBinderName(raw);
    if (name) out[key] = name;
  }
  return out;
}

function rootWhereNeedsGenericResolver(
  where: ReturnType<typeof parseSqlMapping>,
  args: Record<string, unknown>,
): boolean {
  if (whereHasClientFilter(where)) return true;
  if (args.filter) return true; // legacy `@sql(filter:)`
  // Root find() does not apply orderBy binders — keep generic resolve.
  if (args.orderBy) return true;
  // Nested CONNECTION/ROWS with `$this` must not use root `find()` (would drop the join).
  for (const entry of where.entries) {
    if (entry.value?.kind === 'this') return true;
  }
  // Pagination: exact `$args.<name>` (including aliases like `$args.take`) is planned;
  // any other binder form needs the generic path (`resolvePlannerArg`).
  for (const key of ['limit', 'offset', 'first', 'after', 'last', 'before'] as const) {
    const raw = args[key];
    if (raw == null || raw === '') continue;
    if (!argsBinderName(raw)) return true;
  }
  // Fixed literals (`active: true`) and column `$args` binders are not applied by find().
  for (const entry of where.entries) {
    if (entry.spread || entry.children || entry.key.startsWith('$')) continue;
    if (entry.value?.kind === 'literal') return true;
    if (entry.value?.kind === 'args') return true;
  }
  return false;
}

function rowWhereTooComplexForGet(where: ReturnType<typeof parseSqlMapping>): boolean {
  if (whereHasClientFilter(where)) return true;
  const equality = where.entries.filter(
    e =>
      !e.spread &&
      !e.children &&
      !e.key.startsWith('$') &&
      e.value &&
      (e.value.kind === 'args' || e.value.kind === 'literal' || e.value.kind === 'this'),
  );
  // resource.get handles a single args equality only.
  if (equality.length !== 1) return true;
  return equality[0].value?.kind !== 'args';
}

function makeRelationPlan(
  kind: 'ROW' | 'ROWS',
  relationName: string,
  rel?: {
    localAttributes?: string[];
    remoteAttributes?: string[];
    remoteResource?: { get?: (spec: Record<string, unknown>) => unknown };
  },
) {
  return function sqlRelationPlan($parent: any) {
    if (kind === 'ROW') {
      if (typeof $parent?.singleRelation === 'function') {
        return $parent.singleRelation(relationName);
      }
      // Plain-object parent (bailed root): look up by FK attribute.
      const localAttr = rel?.localAttributes?.[0];
      const remoteAttr = rel?.remoteAttributes?.[0];
      const remote = rel?.remoteResource;
      if (localAttr && remoteAttr && remote && typeof remote.get === 'function') {
        return remote.get({ [remoteAttr]: access($parent, localAttr) });
      }
      return null;
    }
    if (kind === 'ROWS' && typeof $parent?.manyRelation === 'function') {
      return $parent.manyRelation(relationName);
    }
    return null;
  };
}

function fieldArg(fieldArgs: any, nameOrPath: string | readonly string[]): any {
  if (!fieldArgs) return undefined;
  const path = Array.isArray(nameOrPath)
    ? nameOrPath
    : typeof nameOrPath === 'string'
      ? [nameOrPath]
      : [...nameOrPath];
  if (typeof fieldArgs.getRaw === 'function') {
    // grafast FieldArgs.getRaw accepts a path array for nested input fields.
    return path.length === 1 ? fieldArgs.getRaw(path[0]) : fieldArgs.getRaw(path);
  }
  if (typeof fieldArgs.get === 'function') {
    return path.length === 1 ? fieldArgs.get(path[0]) : fieldArgs.get(path);
  }
  return undefined;
}

function makeRootPlan(
  resource: any,
  kind: SqlKind,
  where: ReturnType<typeof parseSqlMapping>,
  sqlToAttr?: Map<string, string>,
  paginationArgs: {
    limit?: string;
    offset?: string;
    first?: string;
    after?: string;
    last?: string;
    before?: string;
  } = {},
) {
  return function sqlRootPlan(_$parent: any, fieldArgs: any) {
    if (kind === 'ROW') {
      // sqlToAttr is SQL→GraphQL; invert to GraphQL→SQL for planner vs physical checks.
      let columnCatalog: Map<string, string> | undefined;
      if (sqlToAttr?.size) {
        columnCatalog = new Map();
        for (const [sql, gql] of sqlToAttr) {
          columnCatalog.set(gql, sql);
        }
      }
      const eqCol = batchableEqualityColumn(where, columnCatalog);
      const binder = eqCol ? where.entries.find(e => e.key === eqCol) : undefined;
      if (binder?.value?.kind === 'args') {
        const path =
          binder.value.path && binder.value.path.length
            ? binder.value.path
            : [binder.value.value].filter(Boolean);
        const $arg = fieldArg(fieldArgs, path as string[]);
        // Use the mapped where key (GraphQL attr / SQL binder), not always PK `id`.
        const attr = attributeForWhereKey(resource, eqCol!, sqlToAttr);
        return resource.get({ [attr]: $arg });
      }
      const $rows = resource.find();
      return typeof $rows.single === 'function' ? $rows.single() : $rows;
    }

    if (kind === 'CONNECTION') {
      // Pagination must go through `connection()` only — setting `first`/`after` on
      // the select step first locks them and the connection setter then fails.
      const $rows = resource.find();
      const $connection = connection($rows);
      if (typeof $connection.setFirst === 'function') {
        $connection.setFirst(fieldArg(fieldArgs, paginationArgs.first || 'first'));
      }
      if (typeof $connection.setAfter === 'function') {
        $connection.setAfter(fieldArg(fieldArgs, paginationArgs.after || 'after'));
      }
      return $connection;
    }

    // ROWS (filters that need generic resolve already bailed above)
    const $rows = resource.find();
    if (typeof $rows.setFirst === 'function') {
      $rows.setFirst(fieldArg(fieldArgs, paginationArgs.limit || 'limit'));
    }
    if (typeof $rows.setOffset === 'function') {
      $rows.setOffset(fieldArg(fieldArgs, paginationArgs.offset || 'offset'));
    }
    return $rows;
  };
}

function attributeForWhereKey(resource: any, key: string, sqlToAttr?: Map<string, string>): string {
  if (sqlToAttr) {
    const mapped = sqlToAttr.get(key);
    if (mapped) return mapped;
    for (const [sqlCol, gql] of sqlToAttr) {
      if (sqlCol.toLowerCase() === key.toLowerCase()) return gql;
    }
  }
  const attrs = resource?.codec?.attributes ?? resource?.resource?.codec?.attributes;
  if (attrs && key in attrs) return key;
  if (attrs) {
    // TS 6: Object.keys(any) is Array<string | number | symbol> — assert string names.
    for (const gql of Object.keys(attrs) as string[]) {
      if (gql.toLowerCase() === key.toLowerCase()) return gql;
    }
  }
  return key;
}
