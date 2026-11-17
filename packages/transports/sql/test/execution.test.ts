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

  it('batches relation ROW lookups with WHERE IN', async () => {
    const schema = await loadGraphQLSchemaFromSql('chinook', {
      endpoint: dbPath,
      includeTables: ['albums', 'artists'],
    });

    const { createSqlClient } = await import('../src/client.js');
    const real = createSqlClient({
      dialect: 'sqlite',
      location: `file:${dbPath}`,
    });
    const queries: string[] = [];
    const spyClient: SqlClient = {
      dialect: 'sqlite',
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
      // Two albums → one batched artists query (not two)
      const artistQueries = queries.filter(q => /FROM ["`]?artists["`]?/i.test(q));
      expect(artistQueries.length).toBe(1);
      expect(artistQueries[0]).toMatch(/IN\s*\(/i);
    } finally {
      await (executor as any)[Symbol.asyncDispose]?.();
    }
  });
});
