import type { GraphQLSchema } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import MySQLHandler from '@graphql-mesh/mysql';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import type { YamlConfig } from '@graphql-mesh/types';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { loadGraphQLSchemaFromMySQL, type LoadGraphQLSchemaFromMySQLOpts } from '@omnigraph/mysql';

jest.mock('@graphql-mesh/utils');
jest.mock('@omnigraph/mysql');

const noOpFunction: any = () => {};

describe('mysql', () => {
  let store: MeshStore;
  using cache = new InMemoryLRUCache();
  beforeEach(() => {
    store = new MeshStore('.mesh', new InMemoryStoreStorageAdapter(), {
      readonly: false,
      validate: false,
    });
  });

  it('correctly builds schema from loadGraphQLSchemaFromMySQL after passing configuration', async () => {
    const graphQLSchemaMock: GraphQLSchema = {
      description: 'someGraphQLSchemaMock',
    } as any;

    const configMock: YamlConfig.MySQLHandler = {
      database: 'testdb',
      tables: ['testTable'],
      tableFields: [
        {
          table: 'testTable',
          fields: ['testField'],
        },
      ],
      ssl: {
        rejectUnauthorized: true,
        ca: 'someCA',
      },
    };

    jest.mocked(loadGraphQLSchemaFromMySQL).mockResolvedValue(graphQLSchemaMock);

    const handler = new MySQLHandler({
      name: 'test',
      config: configMock,
      baseDir: __dirname,
      cache,
      pubsub: noOpFunction,
      store,
      importFn: noOpFunction,
      logger: noOpFunction,
    });

    const expectedOptions: LoadGraphQLSchemaFromMySQLOpts = {
      endpoint: 'mysqls://localhost:3306/testdb',
      ssl: {
        rejectUnauthorized: configMock.ssl!.rejectUnauthorized,
        caPath: configMock.ssl!.ca,
      },
      tables: configMock.tables,
      tableFields: configMock.tableFields,
    };

    const { schema } = await handler.getMeshSource();

    expect(schema).toBe(graphQLSchemaMock);
    expect(loadGraphQLSchemaFromMySQL).toHaveBeenCalledWith('test', expectedOptions);
  });
});
