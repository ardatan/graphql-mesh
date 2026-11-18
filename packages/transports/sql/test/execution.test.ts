import { join } from 'node:path';
import { parse, type ExecutionResult } from 'graphql';
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
    const executor = await getSqlExecutor({ subgraph: schema });
    try {
      const result = (await executor({
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
      })) as ExecutionResult;
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

  it('resolves PostGraphile-style many-to-many playlist.tracks', async () => {
    const schema = await loadGraphQLSchemaFromSql('chinook', {
      endpoint: dbPath,
      includeTables: ['playlists', 'playlist_track', 'tracks'],
    });
    const executor = await getSqlExecutor({ subgraph: schema });
    try {
      const result = (await executor({
        document: parse(/* GraphQL */ `
          query {
            playlist(id: "1") {
              id
              name
              tracks(limit: 3, orderBy: [ID_ASC]) {
                id
                name
              }
            }
          }
        `),
      })) as ExecutionResult;
      expect(result.errors).toBeUndefined();
      const playlist = (result.data as any)?.playlist;
      expect(playlist?.id).toBe('1');
      expect(playlist?.tracks?.length).toBe(3);
      expect(playlist.tracks[0]).toEqual(
        expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
      );
    } finally {
      await (executor as any)[Symbol.asyncDispose]?.();
    }
  });

  it('resolves Federation _entities via type-level @sql', async () => {
    const schema = await loadGraphQLSchemaFromSql('chinook', {
      endpoint: dbPath,
      includeTables: ['albums', 'artists'],
    });
    const executor = await getSqlExecutor({ subgraph: schema });
    try {
      const result = (await executor({
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
      })) as ExecutionResult;
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

    const executor = await getSqlExecutor({ subgraph: schema, client: spyClient });
    try {
      const result = (await executor({
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
      })) as ExecutionResult;
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

  it('folds has-many albums into one JSON subselect', async () => {
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

    const executor = await getSqlExecutor({ subgraph: schema, client: spyClient });
    try {
      const result = (await executor({
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
      })) as ExecutionResult;
      expect(result.errors).toBeUndefined();
      expect(queries.length).toBe(1);
      expect(queries[0]).toMatch(/json_group_array/i);
      expect(result.data).toEqual({
        artists: [
          {
            id: '1',
            albums: [
              { title: 'For Those About To Rock We Salute You' },
              { title: 'Let There Be Rock' },
            ],
          },
          {
            id: '2',
            albums: [{ title: 'Balls to the Wall' }, { title: 'Restless and Wild' }],
          },
        ],
      });
    } finally {
      await (executor as any)[Symbol.asyncDispose]?.();
    }
  });

  it('folds multi-hop track→album→artist into one JOIN chain', async () => {
    const schema = await loadGraphQLSchemaFromSql('chinook', {
      endpoint: dbPath,
      includeTables: ['albums', 'artists', 'tracks', 'genres'],
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

    const executor = await getSqlExecutor({ subgraph: schema, client: spyClient });
    try {
      const result = (await executor({
        document: parse(/* GraphQL */ `
          query {
            tracks(limit: 2) {
              name
              album {
                title
                artist {
                  name
                }
              }
              genre {
                name
              }
            }
          }
        `),
        context: {},
      })) as ExecutionResult;
      expect(result.errors).toBeUndefined();
      expect(queries.length).toBe(1);
      expect(queries[0]).toMatch(/LEFT JOIN/i);
      expect(result.data).toEqual({
        tracks: [
          {
            name: 'For Those About To Rock (We Salute You)',
            album: {
              title: 'For Those About To Rock We Salute You',
              artist: { name: 'AC/DC' },
            },
            genre: { name: 'Rock' },
          },
          {
            name: 'Balls to the Wall',
            album: {
              title: 'Balls to the Wall',
              artist: { name: 'Accept' },
            },
            genre: { name: 'Rock' },
          },
        ],
      });
    } finally {
      await (executor as any)[Symbol.asyncDispose]?.();
    }
  });
});
