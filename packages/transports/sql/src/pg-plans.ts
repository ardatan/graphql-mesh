import { access, connection } from 'grafast';
import type { GraphQLFieldConfig, GraphQLSchema } from 'graphql';
import { getDefDirectives } from '@graphql-mesh/utils';
import { MapperKind, mapSchema } from '@graphql-tools/utils';
import { batchableEqualityColumn } from './batch.js';
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
          // Note: when a root for this parent type keeps a generic resolver, nested
          // relation plans still apply for *planned* parents (e.g. `country { city }`).
          // Plain-object parents from a bailed root need the generic child resolve —
          // that mixed path remains a known limitation (prefer planned roots).
          grafast.plan = makeRelationPlan(kind, fieldName);
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
        grafast.plan = makeRootPlan(resource, kind, where, sqlToAttr);
        delete (fieldConfig as GraphQLFieldConfig<any, any>).resolve;
        return fieldConfig;
      }

      // Column scalars on table types: `$row.get('id')` for Pg steps, `access` for
      // plain objects from a generic parent resolve (mixed GraphQL.js / Grafast).
      const parentTable = meta.tableByType.get(typeName);
      if (!parentTable) return fieldConfig;
      const parentResource = (registry.pgResources as any)[parentTable];
      const attrs = parentResource?.codec?.attributes;
      if (!attrs || !(fieldName in attrs)) return fieldConfig;

      grafast.plan = function sqlAttributePlan($row: any) {
        if ($row && typeof $row.get === 'function') return $row.get(fieldName);
        return access($row, fieldName);
      };
      delete (fieldConfig as GraphQLFieldConfig<any, any>).resolve;
      return fieldConfig;
    },
  });
}

function relationHasClientPlanners(args: Record<string, unknown>): boolean {
  const where = String(args.where || '');
  if (where.includes('$args')) return true;
  for (const key of ['orderBy', 'limit', 'offset', 'first', 'after', 'filter'] as const) {
    if (args[key]) return true;
  }
  return false;
}

/** Relation plans only apply the `$this` join — anything else drops filters. */
function relationWhereTooComplexForPlan(where: ReturnType<typeof parseSqlMapping>): boolean {
  for (const entry of where.entries) {
    if (entry.spread) return true;
    if (entry.children) continue;
    if (entry.key.startsWith('$')) {
      // bare `$args.where` / `$this.x` whole-value binders
      if (entry.value?.kind === 'args') return true;
      continue;
    }
    if (entry.value?.kind === 'this') continue;
    // `tenant_id: $args.tenantId`, fixed literals, etc.
    return true;
  }
  return false;
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

function rootWhereNeedsGenericResolver(
  where: ReturnType<typeof parseSqlMapping>,
  args: Record<string, unknown>,
): boolean {
  if (whereHasClientFilter(where)) return true;
  if (args.filter) return true; // legacy `@sql(filter:)`
  // Root find() does not apply orderBy binders — keep generic resolve.
  if (args.orderBy) return true;
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

function makeRelationPlan(kind: 'ROW' | 'ROWS', relationName: string) {
  return function sqlRelationPlan($parent: any) {
    if (kind === 'ROW' && typeof $parent?.singleRelation === 'function') {
      return $parent.singleRelation(relationName);
    }
    if (kind === 'ROWS' && typeof $parent?.manyRelation === 'function') {
      const $rows = $parent.manyRelation(relationName);
      return $rows;
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
) {
  return function sqlRootPlan(_$parent: any, fieldArgs: any) {
    if (kind === 'ROW') {
      const eqCol = batchableEqualityColumn(where);
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
      const $rows = resource.find();
      if (typeof $rows.setFirst === 'function') {
        $rows.setFirst(fieldArg(fieldArgs, 'first'));
      }
      if (typeof $rows.setAfter === 'function') {
        $rows.setAfter(fieldArg(fieldArgs, 'after'));
      }
      const $connection = connection($rows);
      if (typeof $connection.setFirst === 'function') {
        $connection.setFirst(fieldArg(fieldArgs, 'first'));
      }
      if (typeof $connection.setAfter === 'function') {
        $connection.setAfter(fieldArg(fieldArgs, 'after'));
      }
      return $connection;
    }

    // ROWS (filters that need generic resolve already bailed above)
    const $rows = resource.find();
    if (typeof $rows.setFirst === 'function') {
      $rows.setFirst(fieldArg(fieldArgs, 'limit'));
    }
    if (typeof $rows.setOffset === 'function') {
      $rows.setOffset(fieldArg(fieldArgs, 'offset'));
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
