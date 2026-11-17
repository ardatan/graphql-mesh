import { GraphQLBoolean, GraphQLInt, GraphQLNonNull, GraphQLString } from 'graphql';
import { SchemaComposer } from 'graphql-compose';
import { GraphQLBigInt, GraphQLDate, GraphQLDateTime, GraphQLJSON } from 'graphql-scalars';
import { path as pathHelper } from '@graphql-mesh/cross-helpers';
import type { SqlDialect } from '@graphql-mesh/transport-sql';
import {
  SqlMutationDirective,
  SqlMutationKindEnum,
  SqlQueryDirective,
  SqlQueryKindEnum,
  SqlRelationDirective,
  TransportDirective,
} from './directives.js';
import { introspectSqlite } from './introspect/sqlite.js';
import type { SqlColumnMeta, SqlSchemaMeta, SqlTableMeta } from './introspect/types.js';
import { createDefaultNaming, type SqlNaming } from './naming.js';
import { mapSqlTypeToGraphQL } from './type-map.js';

const FEDERATION_LINK_URL = 'https://specs.apollo.dev/federation/v2.6';

export interface LoadSqlSubgraphOpts {
  type: SqlDialect;
  /** Sqlite file path (relative to cwd or absolute) */
  db?: string;
  /** Connection URI for postgres/mysql (or sqlite file:) */
  connectionString?: string;
  cwd?: string;
  schema?: string;
  includeTables?: string[];
  excludeTables?: string[];
  naming?: Partial<SqlNaming>;
}

export async function loadGraphQLSchemaFromSql(subgraphName: string, opts: LoadSqlSubgraphOpts) {
  const naming: SqlNaming = { ...createDefaultNaming(), ...opts.naming };
  const meta = await introspect(opts);
  const location = resolveLocation(opts);
  const schemaComposer = new SchemaComposer();

  schemaComposer.add(GraphQLBigInt);
  schemaComposer.add(GraphQLJSON);
  schemaComposer.add(GraphQLDate);
  schemaComposer.add(GraphQLDateTime);
  schemaComposer.addDirective(TransportDirective);
  schemaComposer.addDirective(SqlQueryDirective);
  schemaComposer.addDirective(SqlMutationDirective);
  schemaComposer.addDirective(SqlRelationDirective);
  schemaComposer.add(SqlQueryKindEnum);
  schemaComposer.add(SqlMutationKindEnum);

  ensureSharedFilterInputs(schemaComposer);
  ensurePageInfo(schemaComposer);

  const tableByName = new Map(meta.tables.map(t => [t.name, t]));
  const typeNameByTable = new Map(
    meta.tables.map(t => [t.name, naming.typeName(t.name)] as const),
  );

  // Pass 1: object types + column fields
  for (const table of meta.tables) {
    const typeName = typeNameByTable.get(table.name)!;
    const pkCols = table.columns.filter(c => c.primaryKey);
    const solePk = pkCols.length === 1 ? pkCols[0] : undefined;

    const otc = schemaComposer.createObjectTC({
      name: typeName,
      fields: {},
    });
    otc.setDirectives([
      {
        name: 'key',
        args: {
          fields: solePk
            ? naming.pkFieldName(solePk.name, true)
            : pkCols.map(c => naming.fieldName(c.name)).join(' '),
        },
      },
    ]);

    for (const col of table.columns) {
      const isSolePkCol = Boolean(solePk && col.name === solePk.name);
      const fieldName = isSolePkCol
        ? naming.pkFieldName(col.name, true)
        : naming.fieldName(col.name);
      const gqlType = mapSqlTypeToGraphQL(col.dataType, { asId: isSolePkCol });
      otc.setField(fieldName, {
        type: col.notNull || isSolePkCol ? new GraphQLNonNull(gqlType) : gqlType,
      });
    }

    createFilterAndOrder(schemaComposer, naming, typeName, table, solePk);
    createConnectionTypes(schemaComposer, typeName);
    createMutationInputs(schemaComposer, naming, typeName, table, solePk);
  }

  // Pass 2: relations
  for (const table of meta.tables) {
    const typeName = typeNameByTable.get(table.name)!;
    const otc = schemaComposer.getOTC(typeName);
    const solePk = table.columns.filter(c => c.primaryKey);
    const solePkCol = solePk.length === 1 ? solePk[0] : undefined;

    for (const fk of table.foreignKeys) {
      if (fk.columns.length !== 1 || fk.refColumns.length !== 1) continue;
      const refTable = tableByName.get(fk.refTable);
      if (!refTable) continue;
      const refTypeName = typeNameByTable.get(fk.refTable)!;
      const localCol = fk.columns[0];
      const refCol = fk.refColumns[0];
      const localField =
        solePkCol && localCol === solePkCol.name
          ? naming.pkFieldName(localCol, true)
          : naming.fieldName(localCol);
      const refSolePk = refTable.columns.filter(c => c.primaryKey);
      const refField =
        refSolePk.length === 1 && refCol === refSolePk[0].name
          ? naming.pkFieldName(refCol, true)
          : naming.fieldName(refCol);

      // belongsTo on local table
      const belongsToName = naming.singularField(refTypeName);
      if (!otc.hasField(belongsToName)) {
        otc.setField(belongsToName, {
          type: refTypeName,
          directives: [
            {
              name: 'sql__relation',
              args: {
                subgraph: subgraphName,
                table: fk.refTable,
                kind: 'ROW',
                args: `${refCol}: $this.${localField}`,
                selection: selectionBlock(naming, refTable),
              },
            },
          ],
        });
      }

      // hasMany on referenced table
      const refOtc = schemaComposer.getOTC(refTypeName);
      const hasManyName = naming.pluralField(typeName);
      if (!refOtc.hasField(hasManyName)) {
        refOtc.setField(hasManyName, {
          type: `[${typeName}!]!`,
          args: {
            filter: naming.filterInput(typeName),
            orderBy: `[${naming.orderByEnum(typeName)}!]`,
            limit: 'Int',
            offset: 'Int',
          },
          directives: [
            {
              name: 'sql__relation',
              args: {
                subgraph: subgraphName,
                table: table.name,
                kind: 'ROWS',
                args: [
                  `${localCol}: $this.${refField}`,
                  `filter: $args.filter`,
                  `orderBy: $args.orderBy`,
                  `limit: $args.limit`,
                  `offset: $args.offset`,
                ].join('\n'),
                selection: selectionBlock(naming, table),
              },
            },
          ],
        });
      }
    }
  }

  // Pass 3: Query + Mutation roots
  const queryTC = schemaComposer.Query;
  const mutationTC = schemaComposer.Mutation;

  for (const table of meta.tables) {
    const typeName = typeNameByTable.get(table.name)!;
    const pkCols = table.columns.filter(c => c.primaryKey);
    const solePk = pkCols.length === 1 ? pkCols[0] : undefined;
    const selection = selectionBlock(naming, table);
    const plural = naming.pluralField(typeName);
    const singular = naming.singularField(typeName);

    if (solePk) {
      const pkField = naming.pkFieldName(solePk.name, true);
      queryTC.setField(singular, {
        type: typeName,
        args: {
          [pkField]: 'ID!',
        },
        directives: [
          {
            name: 'sql__query',
            args: {
              subgraph: subgraphName,
              table: table.name,
              kind: 'ROW',
              args: `${solePk.name}: $args.${pkField}`,
              selection,
              entity: true,
            },
          },
        ],
      });
    }

    queryTC.setField(plural, {
      type: `[${typeName}!]!`,
      args: {
        filter: naming.filterInput(typeName),
        orderBy: `[${naming.orderByEnum(typeName)}!]`,
        limit: { type: GraphQLInt, defaultValue: 10 },
        offset: { type: GraphQLInt, defaultValue: 0 },
      },
      directives: [
        {
          name: 'sql__query',
          args: {
            subgraph: subgraphName,
            table: table.name,
            kind: 'ROWS',
            args: [
              `filter: $args.filter`,
              `orderBy: $args.orderBy`,
              `limit: $args.limit`,
              `offset: $args.offset`,
            ].join('\n'),
            selection,
          },
        },
      ],
    });

    queryTC.setField(naming.connectionField(typeName), {
      type: `${typeName}Connection!`,
      args: {
        filter: naming.filterInput(typeName),
        orderBy: `[${naming.orderByEnum(typeName)}!]`,
        first: GraphQLInt,
        after: GraphQLString,
      },
      directives: [
        {
          name: 'sql__query',
          args: {
            subgraph: subgraphName,
            table: table.name,
            kind: 'CONNECTION',
            args: [
              `filter: $args.filter`,
              `orderBy: $args.orderBy`,
              `first: $args.first`,
              `after: $args.after`,
            ].join('\n'),
            selection: [
              `nodes {`,
              indent(selection),
              `}`,
              `edges {`,
              `  cursor: $cursor`,
              `  node {`,
              indent(selection, 2),
              `  }`,
              `}`,
              `pageInfo {`,
              `  hasNextPage: $hasNextPage`,
              `  hasPreviousPage: $hasPreviousPage`,
              `  startCursor: $startCursor`,
              `  endCursor: $endCursor`,
              `}`,
              `totalCount: $totalCount`,
            ].join('\n'),
          },
        },
      ],
    });

    queryTC.setField(naming.countField(typeName), {
      type: 'Int!',
      args: {
        filter: naming.filterInput(typeName),
      },
      directives: [
        {
          name: 'sql__query',
          args: {
            subgraph: subgraphName,
            table: table.name,
            kind: 'COUNT',
            args: `filter: $args.filter`,
            selection: '$',
          },
        },
      ],
    });

    // Mutations
    const payloadKey = singular;
    mutationTC.setField(`create${typeName}`, {
      type: `${naming.payloadType(typeName)}!`,
      args: {
        input: `${naming.createInput(typeName)}!`,
      },
      directives: [
        {
          name: 'sql__mutation',
          args: {
            subgraph: subgraphName,
            table: table.name,
            kind: 'INSERT',
            args: insertArgsBlock(naming, table, solePk),
            selection: `${payloadKey} {\n${indent(selection)}\n}`,
          },
        },
      ],
    });

    if (solePk) {
      const pkField = naming.pkFieldName(solePk.name, true);
      mutationTC.setField(`update${typeName}`, {
        type: `${naming.payloadType(typeName)}!`,
        args: {
          [pkField]: 'ID!',
          input: `${naming.updateInput(typeName)}!`,
        },
        directives: [
          {
            name: 'sql__mutation',
            args: {
              subgraph: subgraphName,
              table: table.name,
              kind: 'UPDATE',
              args: [
                `set {`,
                indent(updateSetBlock(naming, table, solePk)),
                `}`,
                `where {`,
                `  ${solePk.name}: $args.${pkField}`,
                `}`,
              ].join('\n'),
              selection: `${payloadKey} {\n${indent(selection)}\n}`,
            },
          },
        ],
      });

      mutationTC.setField(`delete${typeName}`, {
        type: `${naming.deletePayloadType(typeName)}!`,
        args: {
          [pkField]: 'ID!',
        },
        directives: [
          {
            name: 'sql__mutation',
            args: {
              subgraph: subgraphName,
              table: table.name,
              kind: 'DELETE',
              args: [`where {`, `  ${solePk.name}: $args.${pkField}`, `}`].join('\n'),
              selection: [`ok: $affectedRows`, `affectedRows: $affectedRows`].join('\n'),
            },
          },
        ],
      });
    }
  }

  const schema = schemaComposer.buildSchema();
  const extensions: any = (schema.extensions ||= {});
  extensions.directives ||= {};
  extensions.directives.transport = {
    subgraph: subgraphName,
    kind: 'sql',
    location,
    options: {
      dialect: opts.type,
    },
  };
  extensions.directives.link = [
    {
      url: FEDERATION_LINK_URL,
      import: ['@key'],
    },
  ];
  return schema;
}

async function introspect(opts: LoadSqlSubgraphOpts): Promise<SqlSchemaMeta> {
  switch (opts.type) {
    case 'sqlite': {
      const db = opts.db || opts.connectionString;
      if (!db) {
        throw new Error(`loadSqlSubgraph type "sqlite" requires db or connectionString`);
      }
      return introspectSqlite({
        db,
        cwd: opts.cwd,
        includeTables: opts.includeTables,
        excludeTables: opts.excludeTables,
      });
    }
    case 'postgres':
      throw new Error(
        'Postgres introspection is not implemented yet in this PR (sqlite end-to-end first).',
      );
    case 'mysql':
      throw new Error(
        'MySQL introspection is not implemented yet in this PR (sqlite end-to-end first).',
      );
    default:
      throw new Error(`Unknown SQL loader type: ${(opts as any).type}`);
  }
}

function resolveLocation(opts: LoadSqlSubgraphOpts): string {
  if (opts.connectionString) return opts.connectionString;
  if (opts.db) {
    const cwd = opts.cwd || process.cwd();
    const abs = pathHelper.isAbsolute(opts.db) ? opts.db : pathHelper.join(cwd, opts.db);
    return `file:${abs}`;
  }
  throw new Error('SQL loader requires db or connectionString');
}

function ensureSharedFilterInputs(schemaComposer: SchemaComposer) {
  if (!schemaComposer.has('StringFilter')) {
    schemaComposer.createInputTC({
      name: 'StringFilter',
      fields: {
        eq: 'String',
        ne: 'String',
        in: '[String!]',
        nin: '[String!]',
        lt: 'String',
        lte: 'String',
        gt: 'String',
        gte: 'String',
        includes: 'String',
        startsWith: 'String',
        endsWith: 'String',
        isNull: 'Boolean',
      },
    });
  }
  if (!schemaComposer.has('IntFilter')) {
    schemaComposer.createInputTC({
      name: 'IntFilter',
      fields: {
        eq: 'Int',
        ne: 'Int',
        in: '[Int!]',
        nin: '[Int!]',
        lt: 'Int',
        lte: 'Int',
        gt: 'Int',
        gte: 'Int',
        isNull: 'Boolean',
      },
    });
  }
}

function ensurePageInfo(schemaComposer: SchemaComposer) {
  if (!schemaComposer.has('PageInfo')) {
    schemaComposer.createObjectTC({
      name: 'PageInfo',
      fields: {
        hasNextPage: 'Boolean!',
        hasPreviousPage: 'Boolean!',
        startCursor: 'String',
        endCursor: 'String',
      },
    });
  }
}

function createFilterAndOrder(
  schemaComposer: SchemaComposer,
  naming: SqlNaming,
  typeName: string,
  table: SqlTableMeta,
  solePk?: SqlColumnMeta,
) {
  const filterFields: Record<string, string> = {
    and: `[${naming.filterInput(typeName)}!]`,
    or: `[${naming.filterInput(typeName)}!]`,
    not: naming.filterInput(typeName),
  };
  const orderValues: Record<string, { value: string }> = {};

  for (const col of table.columns) {
    const isSolePkCol = Boolean(solePk && col.name === solePk.name);
    const fieldName = isSolePkCol
      ? naming.pkFieldName(col.name, true)
      : naming.fieldName(col.name);
    const gql = mapSqlTypeToGraphQL(col.dataType, { asId: isSolePkCol });
    const filterType =
      gql === GraphQLInt || gql.name === 'Int' || gql.name === 'BigInt'
        ? 'IntFilter'
        : gql === GraphQLBoolean
          ? 'IntFilter'
          : 'StringFilter';
    filterFields[fieldName] = filterType;
    orderValues[naming.orderValue(fieldName, 'ASC')] = {
      value: naming.orderValue(fieldName, 'ASC'),
    };
    orderValues[naming.orderValue(fieldName, 'DESC')] = {
      value: naming.orderValue(fieldName, 'DESC'),
    };
  }

  schemaComposer.createInputTC({
    name: naming.filterInput(typeName),
    fields: filterFields,
  });
  schemaComposer.createEnumTC({
    name: naming.orderByEnum(typeName),
    values: orderValues,
  });
}

function createConnectionTypes(schemaComposer: SchemaComposer, typeName: string) {
  if (!schemaComposer.has(`${typeName}Edge`)) {
    schemaComposer.createObjectTC({
      name: `${typeName}Edge`,
      fields: {
        cursor: 'String!',
        node: `${typeName}!`,
      },
    });
  }
  if (!schemaComposer.has(`${typeName}Connection`)) {
    schemaComposer.createObjectTC({
      name: `${typeName}Connection`,
      fields: {
        edges: `[${typeName}Edge!]!`,
        pageInfo: 'PageInfo!',
        nodes: `[${typeName}!]!`,
        totalCount: 'Int!',
      },
    });
  }
}

function createMutationInputs(
  schemaComposer: SchemaComposer,
  naming: SqlNaming,
  typeName: string,
  table: SqlTableMeta,
  solePk?: SqlColumnMeta,
) {
  const createFields: Record<string, any> = {};
  const updateFields: Record<string, any> = {};
  for (const col of table.columns) {
    const isSolePkCol = Boolean(solePk && col.name === solePk.name);
    if (isSolePkCol && col.autoIncrement) continue;
    const fieldName = isSolePkCol
      ? naming.pkFieldName(col.name, true)
      : naming.fieldName(col.name);
    const gqlType = mapSqlTypeToGraphQL(col.dataType, { asId: isSolePkCol });
    createFields[fieldName] = {
      type: col.notNull && !col.autoIncrement ? new GraphQLNonNull(gqlType) : gqlType,
    };
    updateFields[fieldName] = { type: gqlType };
  }
  schemaComposer.createInputTC({
    name: naming.createInput(typeName),
    fields: createFields,
  });
  schemaComposer.createInputTC({
    name: naming.updateInput(typeName),
    fields: updateFields,
  });
  const singular = naming.singularField(typeName);
  schemaComposer.createObjectTC({
    name: naming.payloadType(typeName),
    fields: {
      [singular]: typeName,
    },
  });
  schemaComposer.createObjectTC({
    name: naming.deletePayloadType(typeName),
    fields: {
      ok: 'Boolean!',
      affectedRows: 'Int!',
    },
  });
}

function selectionBlock(naming: SqlNaming, table: SqlTableMeta): string {
  const pkCols = table.columns.filter(c => c.primaryKey);
  const solePk = pkCols.length === 1 ? pkCols[0] : undefined;
  return table.columns
    .map(col => {
      const isSolePkCol = Boolean(solePk && col.name === solePk.name);
      const fieldName = isSolePkCol
        ? naming.pkFieldName(col.name, true)
        : naming.fieldName(col.name);
      return `${fieldName}: ${col.name}`;
    })
    .join('\n');
}

function insertArgsBlock(
  naming: SqlNaming,
  table: SqlTableMeta,
  solePk?: SqlColumnMeta,
): string {
  const lines: string[] = [];
  for (const col of table.columns) {
    const isSolePkCol = Boolean(solePk && col.name === solePk.name);
    if (isSolePkCol && col.autoIncrement) continue;
    const fieldName = isSolePkCol
      ? naming.pkFieldName(col.name, true)
      : naming.fieldName(col.name);
    lines.push(`${col.name}: $args.input.${fieldName}`);
  }
  return lines.join('\n');
}

function updateSetBlock(
  naming: SqlNaming,
  table: SqlTableMeta,
  solePk?: SqlColumnMeta,
): string {
  const lines: string[] = [];
  for (const col of table.columns) {
    const isSolePkCol = Boolean(solePk && col.name === solePk.name);
    if (isSolePkCol) continue;
    const fieldName = naming.fieldName(col.name);
    lines.push(`${col.name}: $args.input.${fieldName}`);
  }
  return lines.join('\n');
}

function indent(text: string, spaces = 1): string {
  const pad = '  '.repeat(spaces);
  return text
    .split('\n')
    .map(l => (l ? pad + l : l))
    .join('\n');
}
