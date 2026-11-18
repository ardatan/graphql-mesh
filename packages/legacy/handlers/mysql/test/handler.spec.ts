import type { GraphQLSchema } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import MySQLHandler from '@graphql-mesh/mysql';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import type { YamlConfig } from '@graphql-mesh/types';
import { getSqlExecutor, loadGraphQLSchemaFromSql } from '@omnigraph/sql';

jest.mock('@omnigraph/sql');

const noOpFunction: any = () => {};

describe('mysql', () => {
  let store: MeshStore;
  using cache = new InMemoryLRUCache();
  beforeEach(() => {
    store = new MeshStore('.mesh', new InMemoryStoreStorageAdapter(), {
      readonly: false,
      validate: false,
    });
    jest.mocked(getSqlExecutor).mockReturnValue({} as any);
  });

  it('builds schema via loadGraphQLSchemaFromSql after mapping MySQL config', async () => {
    const graphQLSchemaMock: GraphQLSchema = {
      description: 'someGraphQLSchemaMock',
    } as any;

    const configMock: YamlConfig.MySQLHandler = {
      database: 'testdb',
      tables: ['testTable'],
      tableFields: [{ table: 'testTable', fields: ['testField'] }],
      ssl: {
        rejectUnauthorized: true,
        ca: 'someCA',
      },
    };

    jest.mocked(loadGraphQLSchemaFromSql).mockResolvedValue(graphQLSchemaMock);

    const handler = new MySQLHandler({
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
      endpoint: 'mysqls://localhost:3306/testdb',
      includeTables: configMock.tables,
      tableFields: configMock.tableFields,
      cwd: __dirname,
      tls: true,
      ssl: {
        rejectUnauthorized: true,
        ca: 'someCA',
      },
    });
    expect(getSqlExecutor).toHaveBeenCalledWith({
      subgraph: graphQLSchemaMock,
      cwd: __dirname,
      client: undefined,
    });
  });
});
