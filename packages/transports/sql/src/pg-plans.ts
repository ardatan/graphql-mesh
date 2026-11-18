import { connection } from 'grafast';
import type { GraphQLFieldConfig, GraphQLSchema } from 'graphql';
import { getDefDirectives } from '@graphql-mesh/utils';
import { MapperKind, mapSchema } from '@graphql-tools/utils';
import { batchableEqualityColumn } from './batch.js';
import { parseSqlMapping } from './mapping.js';
import type { MeshPgRegistry } from './pg-registry.js';
import type { SqlKind } from './types.js';

/**
 * Attach Grafast / `@dataplan/pg` plan resolvers for `@sql` query fields.
 * Mutations keep traditional resolvers for this slice.
 */
export function wirePostgresSqlPlans(
  schema: GraphQLSchema,
  registry: MeshPgRegistry,
  meta: {
    relationNames: Map<string, Map<string, { remoteTable: string; kind: 'ROW' | 'ROWS' }>>;
    tableByType: Map<string, string>;
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
          grafast.plan = makeRelationPlan(kind, fieldName);
        } else {
          grafast.plan = makeRootPlan(resource, kind, where);
        }

        delete (fieldConfig as GraphQLFieldConfig<any, any>).resolve;
        return fieldConfig;
      }

      // Column scalars on table types: `$row.get('id')` etc. (no @sql on the field)
      const parentTable = meta.tableByType.get(typeName);
      if (!parentTable) return fieldConfig;
      const parentResource = (registry.pgResources as any)[parentTable];
      const attrs = parentResource?.codec?.attributes;
      if (!attrs || !(fieldName in attrs)) return fieldConfig;

      grafast.plan = function sqlAttributePlan($row: any) {
        if ($row && typeof $row.get === 'function') return $row.get(fieldName);
        return null;
      };
      delete (fieldConfig as GraphQLFieldConfig<any, any>).resolve;
      return fieldConfig;
    },
  });
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

function fieldArg(fieldArgs: any, name: string): any {
  if (!fieldArgs) return undefined;
  if (typeof fieldArgs.getRaw === 'function') return fieldArgs.getRaw(name);
  if (typeof fieldArgs.get === 'function') return fieldArgs.get(name);
  return undefined;
}

function makeRootPlan(resource: any, kind: SqlKind, where: ReturnType<typeof parseSqlMapping>) {
  return function sqlRootPlan(_$parent: any, fieldArgs: any) {
    if (kind === 'ROW') {
      const eqCol = batchableEqualityColumn(where);
      const binder = eqCol ? where.entries.find(e => e.key === eqCol) : undefined;
      if (binder?.value?.kind === 'args') {
        const argName = binder.value.path?.[0] || binder.value.value;
        const $arg = fieldArg(fieldArgs, argName);
        const attr = pkAttribute(resource);
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
      const $connection = connection($rows);
      if (typeof $connection.setFirst === 'function') {
        $connection.setFirst(fieldArg(fieldArgs, 'first'));
      }
      return $connection;
    }

    if (kind === 'COUNT') {
      const $rows = resource.find();
      // Dataplan aggregate COUNT can be layered later; approximate via find for now.
      return $rows;
    }

    // ROWS
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

function pkAttribute(resource: any): string {
  const attrs = resource?.codec?.attributes;
  if (attrs && typeof attrs === 'object' && 'id' in attrs) return 'id';
  const keys = attrs ? Object.keys(attrs) : [];
  return String(keys[0] ?? 'id');
}
