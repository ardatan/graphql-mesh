import type { GraphQLSchema } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import PostGraphileHandler from '@graphql-mesh/postgraphile';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import type { YamlConfig } from '@graphql-mesh/types';
import { getSqlExecutor, loadGraphQLSchemaFromSql } from '@omnigraph/sql';

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
      cwd: __dirname,
    });
    expect(getSqlExecutor).toHaveBeenCalledWith({
      subgraph: graphQLSchemaMock,
      cwd: __dirname,
      client: undefined,
    });
  });

  it('requires connectionString', async () => {
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
    await expect(handler.getMeshSource()).rejects.toThrow(/connectionString/);
  });
});
