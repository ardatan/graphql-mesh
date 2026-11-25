import { join } from 'node:path';
import { buildSchema, parse, type ExecutionResult } from 'graphql';
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

describe('getSqlExecutor postgres pgSettings fail-closed', () => {
  function postgresSchema(optionsBody: string) {
    return buildSchema(/* GraphQL */ `
      directive @transport(
        subgraph: String!
        kind: String!
        location: String
        options: TransportOptions
      ) on SCHEMA

      input SoftDeleteOptions {
        column: String
      }

      input TransportOptions {
        adapter: String
        softDelete: SoftDeleteOptions
      }

      schema
        @transport(
          subgraph: "pg"
          kind: "sql"
          location: "postgres://localhost/db"
          options: { ${optionsBody} }
        ) {
        query: Query
      }

      type Query {
        hello: String
      }
    `);
  }

  const bunStyleClient: SqlClient = {
    adapter: 'postgres',
    // No pgPool — Bun.SQL / non-pool postgres path.
    async query() {
      return { rows: [], rowCount: 0 };
    },
    dispose() {},
  };

  const clientWithPool: SqlClient = {
    ...bunStyleClient,
    pgPool: { query: async () => ({ rows: [] }) } as any,
  };

  async function expectPgSettingsRejected(
    schema: ReturnType<typeof buildSchema>,
    client: SqlClient,
  ) {
    const executor = await getSqlExecutor({ subgraph: schema, client });
    try {
      await expect(
        executor({
          document: parse(`query { hello }`),
          context: { pgSettings: { role: 'app_user' } },
        }),
      ).rejects.toThrow(/pgSettings is not applied/);
    } finally {
      await (executor as any)[Symbol.asyncDispose]?.();
    }
  }

  it('rejects pgSettings when postgres has no pgPool (Bun.SQL-style)', async () => {
    await expectPgSettingsRejected(postgresSchema('adapter: "postgres"'), bunStyleClient);
  });

  it('rejects pgSettings when softDelete selects the default executor', async () => {
    // Even with a fake pgPool, softDelete forces the GraphQL.js default path.
    await expectPgSettingsRejected(
      postgresSchema('adapter: "postgres", softDelete: { column: "deleted_at" }'),
      clientWithPool,
    );
  });

  it('rejects pgSettings when $fn / through planner extras select the default executor', async () => {
    // printSchemaHasPlannerExtras scans @sql(selection/through). Keep a pgPool so
    // only the planner-extras gate (not missing pool) forces the default path.
    const schema = buildSchema(/* GraphQL */ `
      directive @transport(
        subgraph: String!
        kind: String!
        location: String
        options: TransportOptions
      ) on SCHEMA
      directive @sql(
        table: String!
        kind: String!
        selection: String
        through: String
      ) on FIELD_DEFINITION | OBJECT

      input TransportOptions {
        adapter: String
      }

      schema
        @transport(
          subgraph: "pg"
          kind: "sql"
          location: "postgres://localhost/db"
          options: { adapter: "postgres" }
        ) {
        query: Query
      }

      type Query {
        hello: String
        user: User
          @sql(
            table: "users"
            kind: "ROW"
            selection: """
            id: id
            fullName: $fn.public.users_full_name
            """
          )
        playlistTracks: [Track]
          @sql(
            table: "tracks"
            kind: "ROWS"
            through: """
            table: playlist_track
            local: TrackId
            remote: PlaylistId
            parent: $this.id
            target: id
            """
          )
      }

      type User {
        id: ID
        fullName: String
      }

      type Track {
        id: ID
      }
    `);

    await expectPgSettingsRejected(schema, clientWithPool);
  });
});
