import { context, object, type Step } from 'grafast';
import {
  getNamedType,
  isNonNullType,
  isObjectType,
  isScalarType,
  type GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLSchema,
} from 'graphql';
import { sql } from 'pg-sql2';
import {
  makeRegistry,
  makeRegistryBuilder,
  PgExecutor,
  pgResourceOptions,
  recordCodec,
  TYPES,
  type PgCodec,
  type PgCodecAttribute,
} from '@dataplan/pg';
import { getDefDirectives } from '@graphql-mesh/utils';
import { parseSqlMapping } from './mapping.js';
import type { ParsedSqlMapping, SqlKind } from './types.js';

export type MeshPgRegistry = ReturnType<typeof makeRegistry>;

interface TableBuildInfo {
  table: string;
  /** GraphQL field name → SQL column */
  columns: Map<string, { sqlCol: string; notNull: boolean; codec: PgCodec }>;
  /** GraphQL object type names that represent this table's rows */
  typeNames: Set<string>;
}

/**
 * Build a `@dataplan/pg` registry from `@sql` directives on the subgraph schema.
 * Attribute names are GraphQL field names; SQL columns are selected via expression.
 */
export function buildPgRegistryFromSqlSchema(
  schema: GraphQLSchema,
  opts?: { pgSchema?: string },
): {
  registry: MeshPgRegistry;
  executor: PgExecutor;
  tableByType: Map<string, string>;
  relationNames: Map<string, Map<string, { remoteTable: string; kind: 'ROW' | 'ROWS' }>>;
  /** Relations successfully passed to `addRelation` (may be a subset of `relationNames`). */
  installedRelations: Map<string, Set<string>>;
  /** table → SQL column → GraphQL attribute name (from `@sql(selection:)`). */
  sqlToAttrByTable: Map<string, Map<string, string>>;
} {
  const pgSchema = opts?.pgSchema?.trim() || 'public';
  const executor = new PgExecutor({
    name: 'mesh-sql',
    context: () => {
      const $ctx = context();
      return object({
        pgSettings: $ctx.get('pgSettings'),
        withPgClient: $ctx.get('withPgClient'),
      }) as Step<any>;
    },
  });

  const tables = new Map<string, TableBuildInfo>();
  const tableByType = new Map<string, string>();
  const relationNames = new Map<
    string,
    Map<string, { remoteTable: string; kind: 'ROW' | 'ROWS' }>
  >();
  const installedRelations = new Map<string, Set<string>>();

  const ensureTable = (table: string): TableBuildInfo => {
    let info = tables.get(table);
    if (!info) {
      info = { table, columns: new Map(), typeNames: new Set() };
      tables.set(table, info);
    }
    return info;
  };

  const absorbSelection = (
    info: TableBuildInfo,
    selection: ParsedSqlMapping,
    objectType: GraphQLObjectType | null,
  ) => {
    for (const entry of selection.entries) {
      if (!entry.value || entry.value.kind !== 'column') continue;
      const sqlCol = entry.value.value;
      const field = objectType?.getFields()[entry.key];
      const codec = codecFromGraphqlType(field?.type);
      const notNull = field ? isNonNullType(field.type as any) : false;
      const prev = info.columns.get(entry.key);
      if (!prev) {
        info.columns.set(entry.key, { sqlCol, notNull, codec });
      } else if (notNull && !prev.notNull) {
        info.columns.set(entry.key, { sqlCol, notNull: true, codec: prev.codec });
      }
    }
  };

  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type) || type.name.startsWith('__')) continue;

    // Type-level @sql
    for (const dir of getDefDirectives(schema, type).filter(d => d.name === 'sql')) {
      const table = String(dir.args.table || '');
      if (!table) continue;
      const info = ensureTable(table);
      info.typeNames.add(type.name);
      tableByType.set(type.name, table);
      absorbSelection(info, parseSqlMapping(dir.args.selection as string | undefined), type);
    }

    for (const field of Object.values(type.getFields())) {
      for (const dir of getDefDirectives(schema, field).filter(d => d.name === 'sql')) {
        const table = String(dir.args.table || '');
        if (!table) continue;
        const kind = (dir.args.kind || 'ROWS') as SqlKind;
        const info = ensureTable(table);
        const returnType = unwrapObjectType(field.type);
        if (returnType && (kind === 'ROW' || kind === 'ROWS' || kind === 'CONNECTION')) {
          // CONNECTION returns Connection type — dig nodes
          const nodeType =
            kind === 'CONNECTION' ? unwrapConnectionNodeType(returnType) : returnType;
          if (nodeType) {
            info.typeNames.add(nodeType.name);
            tableByType.set(nodeType.name, table);
            absorbSelection(
              info,
              parseSqlMapping(dir.args.selection as string | undefined),
              nodeType,
            );
          }
        } else {
          absorbSelection(
            info,
            parseSqlMapping(dir.args.selection as string | undefined),
            returnType,
          );
        }

        // Record relations for plan wiring
        if (
          (kind === 'ROW' || kind === 'ROWS') &&
          type.name !== 'Query' &&
          type.name !== 'Mutation'
        ) {
          let rels = relationNames.get(type.name);
          if (!rels) {
            rels = new Map();
            relationNames.set(type.name, rels);
          }
          rels.set(field.name, { remoteTable: table, kind });
        }
      }
    }
  }

  // Ensure at least id columns exist
  for (const info of tables.values()) {
    if (!info.columns.has('id')) {
      info.columns.set('id', {
        sqlCol: 'id',
        notNull: true,
        codec: TYPES.int,
      });
    }
  }

  // Align FK endpoint codecs before building record codecs (GraphQL ID→text vs Int FK).
  alignRelationCodecs(schema, tables, tableByType);

  const builder = makeRegistryBuilder();
  const resourceOptionsByTable = new Map<string, ReturnType<typeof pgResourceOptions>>();
  const codecByTable = new Map<string, ReturnType<typeof recordCodec>>();

  for (const info of tables.values()) {
    const attributes: Record<string, PgCodecAttribute> = {};
    for (const [gqlField, col] of info.columns) {
      const sqlCol = col.sqlCol;
      attributes[gqlField] = {
        codec: col.codec,
        notNull: col.notNull,
        expression: alias => sql`${alias}.${sql.identifier(sqlCol)}`,
      };
    }

    const tableIdent =
      pgSchema && pgSchema !== 'public'
        ? sql`${sql.identifier(pgSchema)}.${sql.identifier(info.table)}`
        : sql`${sql.identifier(info.table)}`;
    const codec = recordCodec({
      executor,
      name: `${info.table}_codec`,
      identifier: tableIdent,
      attributes,
    });
    codecByTable.set(info.table, codec);
    builder.addCodec(codec);

    const pkAttrs = info.columns.has('id') ? ['id'] : [info.columns.keys().next().value!];
    const resourceOpts = pgResourceOptions({
      executor,
      codec,
      from: tableIdent,
      name: info.table,
      uniques: [{ attributes: pkAttrs, isPrimary: true }],
    });
    resourceOptionsByTable.set(info.table, resourceOpts);
    builder.addResource(resourceOpts);
  }

  // Relations from @sql $this binders
  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type) || type.name.startsWith('__')) continue;
    const localTable = tableByType.get(type.name);
    if (!localTable) continue;
    const localCodec = codecByTable.get(localTable);
    if (!localCodec) continue;

    for (const field of Object.values(type.getFields())) {
      for (const dir of getDefDirectives(schema, field).filter(d => d.name === 'sql')) {
        const kind = (dir.args.kind || 'ROWS') as SqlKind;
        if (kind !== 'ROW' && kind !== 'ROWS') continue;
        const remoteTable = String(dir.args.table || '');
        const remoteOpts = resourceOptionsByTable.get(remoteTable);
        if (!remoteOpts) continue;

        const where = parseSqlMapping(dir.args.where as string | undefined);
        let localAttr: string | undefined;
        let remoteAttr: string | undefined;
        for (const entry of where.entries) {
          if (entry.children) continue;
          if (!entry.value || entry.value.kind !== 'this') continue;
          remoteAttr = entry.key; // SQL column on remote — need GraphQL attr on remote codec
          localAttr = entry.value.path?.[0] || entry.value.value;
          break;
        }
        if (!localAttr || !remoteAttr) continue;

        // Map remote SQL column → GraphQL attribute name on remote table
        const remoteInfo = tables.get(remoteTable);
        let remoteGqlAttr = remoteAttr;
        if (remoteInfo) {
          for (const [gql, col] of remoteInfo.columns) {
            if (col.sqlCol === remoteAttr || gql === remoteAttr) {
              remoteGqlAttr = gql;
              break;
            }
          }
        }

        const relationName = field.name;
        try {
          builder.addRelation(localCodec, relationName, remoteOpts, {
            localAttributes: [localAttr],
            remoteAttributes: [remoteGqlAttr],
            isUnique: kind === 'ROW',
            isReferencee: kind === 'ROWS',
          });
          let installed = installedRelations.get(type.name);
          if (!installed) {
            installed = new Set();
            installedRelations.set(type.name, installed);
          }
          installed.add(relationName);
        } catch {
          // Duplicate / incompatible relations — skip
        }
      }
    }
  }

  const sqlToAttrByTable = new Map<string, Map<string, string>>();
  for (const [table, info] of tables) {
    const map = new Map<string, string>();
    for (const [gql, col] of info.columns) {
      // Prefer first GraphQL attr for a given SQL column; exact gql==sql also recorded.
      if (!map.has(col.sqlCol)) map.set(col.sqlCol, gql);
      if (!map.has(gql)) map.set(gql, gql);
    }
    sqlToAttrByTable.set(table, map);
  }

  const registry = makeRegistry(builder.getRegistryConfig());
  return {
    registry,
    executor,
    tableByType,
    relationNames,
    installedRelations,
    sqlToAttrByTable,
  };
}

function unwrapObjectType(type: GraphQLOutputType): GraphQLObjectType | null {
  const named = getNamedType(type);
  return isObjectType(named) ? named : null;
}

function unwrapConnectionNodeType(connectionType: GraphQLObjectType): GraphQLObjectType | null {
  const nodes = connectionType.getFields().nodes;
  if (nodes) return unwrapObjectType(nodes.type);
  const edges = connectionType.getFields().edges;
  if (edges) {
    const edgeType = unwrapObjectType(edges.type);
    const node = edgeType?.getFields().node;
    if (node) return unwrapObjectType(node.type);
  }
  return null;
}

function codecFromGraphqlType(type: GraphQLOutputType | undefined): PgCodec {
  if (!type) return TYPES.text;
  const named = getNamedType(type);
  if (!isScalarType(named)) return TYPES.json;
  switch (named.name) {
    case 'Int':
      return TYPES.int;
    case 'Float':
      return TYPES.float;
    case 'Boolean':
      return TYPES.boolean;
    case 'ID':
      // Natural keys (e.g. country.code) stay text; int PKs aligned via alignRelationCodecs.
      return TYPES.text;
    default:
      return TYPES.text;
  }
}

/**
 * When `@sql` relations join an Int column to a GraphQL `ID` (text codec) attribute,
 * force both ends to Int so `@dataplan/pg` doesn't emit `text = integer`.
 * Multi-pass: A→B alignment can require a second hop (B→C) to converge.
 */
function alignRelationCodecs(
  schema: GraphQLSchema,
  tables: Map<string, TableBuildInfo>,
  tableByType: Map<string, string>,
): void {
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const type of Object.values(schema.getTypeMap())) {
      if (!isObjectType(type) || type.name.startsWith('__')) continue;
      const localTable = tableByType.get(type.name);
      if (!localTable) continue;
      const localInfo = tables.get(localTable);
      if (!localInfo) continue;

      for (const field of Object.values(type.getFields())) {
        for (const dir of getDefDirectives(schema, field).filter(d => d.name === 'sql')) {
          const kind = (dir.args.kind || 'ROWS') as SqlKind;
          if (kind !== 'ROW' && kind !== 'ROWS') continue;
          const remoteTable = String(dir.args.table || '');
          const remoteInfo = tables.get(remoteTable);
          if (!remoteInfo) continue;

          const where = parseSqlMapping(dir.args.where as string | undefined);
          for (const entry of where.entries) {
            if (entry.children || !entry.value || entry.value.kind !== 'this') continue;
            const remoteSqlOrGql = entry.key;
            const localAttr = entry.value.path?.[0] || entry.value.value;
            let remoteGqlAttr = remoteSqlOrGql;
            for (const [gql, col] of remoteInfo.columns) {
              if (col.sqlCol === remoteSqlOrGql || gql === remoteSqlOrGql) {
                remoteGqlAttr = gql;
                break;
              }
            }
            const localCol = localInfo.columns.get(localAttr);
            const remoteCol = remoteInfo.columns.get(remoteGqlAttr);
            if (!localCol || !remoteCol) continue;
            if (localCol.codec === remoteCol.codec) continue;
            const preferInt = localCol.codec === TYPES.int || remoteCol.codec === TYPES.int;
            const codec = preferInt ? TYPES.int : localCol.codec;
            localCol.codec = codec;
            remoteCol.codec = codec;
            changed = true;
          }
        }
      }
    }
    if (!changed) break;
  }
}
