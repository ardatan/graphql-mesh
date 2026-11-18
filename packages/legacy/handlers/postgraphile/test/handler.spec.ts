import type { GraphQLSchema } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import PostGraphileHandler from '@graphql-mesh/postgraphile';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import type { YamlConfig } from '@graphql-mesh/types';
import {
  createSqlClient,
  getSqlExecutor,
  loadGraphQLSchemaFromSql,
  wrapPgPoolAsSqlClient,
} from '@omnigraph/sql';

jest.mock('@omnigraph/sql');

const noOpFunction: any = () => {};

describe('postgraphile', () => {
  let store: MeshStore;
  using cache = new InMemoryLRUCache();
  beforeEach(() => {
    store = new MeshStore('.mesh', new InMemoryStoreStorageAdapter(), {
      readonly: false,
      validate: false,
    });
    jest.mocked(getSqlExecutor).mockReturnValue({} as any);
    jest.mocked(createSqlClient).mockReturnValue({ adapter: 'postgres' } as any);
    jest
      .mocked(wrapPgPoolAsSqlClient)
      .mockImplementation(pool => ({ adapter: 'postgres', pool }) as any);
  });

  it('builds schema via loadGraphQLSchemaFromSql after mapping PostGraphile config', async () => {
    const graphQLSchemaMock: GraphQLSchema = {
      description: 'someGraphQLSchemaMock',
    } as any;

    const configMock: YamlConfig.PostGraphileHandler = {
      connectionString: 'postgres://localhost:5432/testdb',
      schemaName: ['app'],
      tables: ['users'],
      tableFields: [{ table: 'users', fields: ['id', 'email'] }],
    };

    jest.mocked(loadGraphQLSchemaFromSql).mockResolvedValue(graphQLSchemaMock);

    const handler = new PostGraphileHandler({
      name: 'test',
      config: configMock,
      baseDir: __dirname,
      cache,
      pubsub: noOpFunction,
      store,
      importFn: noOpFunction,
      log: noOpFunction,
    });

    const { schema } = await handler.getMeshSource();

    expect(schema).toBe(graphQLSchemaMock);
    expect(loadGraphQLSchemaFromSql).toHaveBeenCalledWith('test', {
      endpoint: 'postgres://localhost:5432/testdb',
      schema: 'app',
      includeTables: configMock.tables,
      tableFields: configMock.tableFields,
      pgPool: undefined,
      cwd: __dirname,
    });
    expect(createSqlClient).toHaveBeenCalledWith({
      adapter: 'postgres',
      location: 'postgres://localhost:5432/testdb',
      schema: 'app',
      cwd: __dirname,
    });
    expect(getSqlExecutor).toHaveBeenCalledWith({
      subgraph: graphQLSchemaMock,
      cwd: __dirname,
      client: { adapter: 'postgres' },
    });
  });

  it('supports pool-only config without connectionString', async () => {
    const graphQLSchemaMock: GraphQLSchema = { description: 'poolOnly' } as any;
    const pool = {
      connect: () => undefined,
      options: { connectionString: 'postgres://from-pool/db' },
    };
    jest.mocked(loadGraphQLSchemaFromSql).mockResolvedValue(graphQLSchemaMock);

    const handler = new PostGraphileHandler({
      name: 'test',
      config: { pool, schemaName: ['app'] },
      baseDir: __dirname,
      cache,
      pubsub: noOpFunction,
      store,
      importFn: noOpFunction,
      log: noOpFunction,
    });

    await handler.getMeshSource();

    expect(loadGraphQLSchemaFromSql).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        endpoint: 'postgres://from-pool/db',
        schema: 'app',
        pgPool: pool,
      }),
    );
    expect(wrapPgPoolAsSqlClient).toHaveBeenCalledWith(pool, { schema: 'app' });
    expect(getSqlExecutor).toHaveBeenCalledWith(
      expect.objectContaining({
        client: expect.anything(),
      }),
    );
  });

  it('pool-only without pool URI omits endpoint (injected client handoff)', async () => {
    const graphQLSchemaMock: GraphQLSchema = { description: 'poolNoUri' } as any;
    const pool = { connect: () => undefined, options: {} };
    jest.mocked(loadGraphQLSchemaFromSql).mockResolvedValue(graphQLSchemaMock);

    const handler = new PostGraphileHandler({
      name: 'test',
      config: { pool, schemaName: ['app'] },
      baseDir: __dirname,
      cache,
      pubsub: noOpFunction,
      store,
      importFn: noOpFunction,
      log: noOpFunction,
    });

    await handler.getMeshSource();

    expect(loadGraphQLSchemaFromSql).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        endpoint: undefined,
        schema: 'app',
        pgPool: pool,
      }),
    );
    expect(wrapPgPoolAsSqlClient).toHaveBeenCalledWith(pool, { schema: 'app' });
  });

  it('requires connectionString or pool', async () => {
    const handler = new PostGraphileHandler({
      name: 'test',
      config: {},
      baseDir: __dirname,
      cache,
      pubsub: noOpFunction,
      store,
      importFn: noOpFunction,
      log: noOpFunction,
    });
    await expect(handler.getMeshSource()).rejects.toThrow(/connectionString|pool/);
  });
});
