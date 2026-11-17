import { join } from 'node:path';
import { parse } from 'graphql';
import { loadGraphQLSchemaFromSql } from '@omnigraph/sql';
import { getSqlExecutor } from '../src/execution.js';
import type { SqlClient } from '../src/types.js';

const dbPath = join(__dirname, '../../../../e2e/sqlite-chinook/chinook.db');

describe('getSqlExecutor sqlite', () => {
  it('resolves albums with artist relation', async () => {
    const schema = await loadGraphQLSchemaFromSql('chinook', {
      endpoint: dbPath,
      includeTables: ['albums', 'artists'],
    });
    const executor = getSqlExecutor({ subgraph: schema });
    try {
      const result = await executor({
        document: parse(/* GraphQL */ `
          query {
            albums(limit: 2) {
              id
              title
              artist {
                name
              }
            }
          }
        `),
      });
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({
        albums: [
          {
            id: '1',
            title: 'For Those About To Rock We Salute You',
            artist: { name: 'AC/DC' },
          },
          {
            id: '2',
            title: 'Balls to the Wall',
            artist: { name: 'Accept' },
          },
        ],
      });
    } finally {
      await (executor as any)[Symbol.asyncDispose]?.();
    }
  });

  it('resolves Federation _entities via type-level @sql', async () => {
    const schema = await loadGraphQLSchemaFromSql('chinook', {
      endpoint: dbPath,
      includeTables: ['albums', 'artists'],
    });
    const executor = getSqlExecutor({ subgraph: schema });
    try {
      const result = await executor({
        document: parse(/* GraphQL */ `
          query ($representations: [_Any!]!) {
            _entities(representations: $representations) {
              ... on Album {
                id
                title
              }
              ... on Artist {
                id
                name
              }
            }
          }
        `),
        variables: {
          representations: [
            { __typename: 'Album', id: '1' },
            { __typename: 'Artist', id: '1' },
          ],
        },
      });
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({
        _entities: [
          { id: '1', title: 'For Those About To Rock We Salute You' },
          { id: '1', name: 'AC/DC' },
        ],
      });
    } finally {
      await (executor as any)[Symbol.asyncDispose]?.();
    }
  });

  it('folds belongs-to artist into one JOIN (lookahead plan)', async () => {
    const schema = await loadGraphQLSchemaFromSql('chinook', {
      endpoint: dbPath,
      includeTables: ['albums', 'artists'],
    });

    const { createSqlClient } = await import('../src/client.js');
    const real = createSqlClient({
      adapter: 'sqlite',
      location: `file:${dbPath}`,
    });
    const queries: string[] = [];
    const spyClient: SqlClient = {
      adapter: 'sqlite',
      async query(sql, params) {
        queries.push(sql);
        return real.query(sql, params);
      },
      dispose: () => real.dispose(),
    };

    const executor = getSqlExecutor({ subgraph: schema, client: spyClient });
    try {
      const result = await executor({
        document: parse(/* GraphQL */ `
          query {
            albums(limit: 2) {
              id
              artist {
                name
              }
            }
          }
        `),
        context: {},
      });
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({
        albums: [
          {
            id: '1',
            artist: { name: 'AC/DC' },
          },
          {
            id: '2',
            artist: { name: 'Accept' },
          },
        ],
      });
      // Single root query with LEFT JOIN — no separate artists round-trip
      expect(queries.length).toBe(1);
      expect(queries[0]).toMatch(/LEFT JOIN/i);
      expect(queries[0]).toMatch(/artists/i);
    } finally {
      await (executor as any)[Symbol.asyncDispose]?.();
    }
  });

  it('still batches has-many / non-joined ROW with WHERE IN', async () => {
    const schema = await loadGraphQLSchemaFromSql('chinook', {
      endpoint: dbPath,
      includeTables: ['albums', 'artists'],
    });

    const { createSqlClient } = await import('../src/client.js');
    const real = createSqlClient({
      adapter: 'sqlite',
      location: `file:${dbPath}`,
    });
    const queries: string[] = [];
    const spyClient: SqlClient = {
      adapter: 'sqlite',
      async query(sql, params) {
        queries.push(sql);
        return real.query(sql, params);
      },
      dispose: () => real.dispose(),
    };

    const executor = getSqlExecutor({ subgraph: schema, client: spyClient });
    try {
      // artists { albums } — albums is ROWS ($this), not foldable belongs-to JOIN
      const result = await executor({
        document: parse(/* GraphQL */ `
          query {
            artists(limit: 2) {
              id
              albums(limit: 5) {
                title
              }
            }
          }
        `),
        context: {},
      });
      expect(result.errors).toBeUndefined();
      const albumQueries = queries.filter(q => /FROM ["`]?albums["`]?/i.test(q));
      expect(albumQueries.length).toBe(1);
      expect(albumQueries[0]).toMatch(/IN\s*\(/i);
    } finally {
      await (executor as any)[Symbol.asyncDispose]?.();
    }
  });
});
