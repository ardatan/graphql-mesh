import OpenAPIHandler from '../src';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { resolve } from 'path';
import { PubSub } from 'graphql-subscriptions';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';

describe('openapi', () => {
  it('should create a GraphQL schema from a simple local swagger file', async () => {
    const handler = new OpenAPIHandler({
      name: 'Instagram',
      config: {
        source: resolve(__dirname, './fixtures/instagram.json'),
      },
      pubsub: new PubSub(),
      cache: new InMemoryLRUCache(),
      store: new MeshStore('openapi', new InMemoryStoreStorageAdapter(), {
        readonly: false,
        validate: false,
      }),
    });
    const source = await handler.getMeshSource();

    expect(printSchemaWithDirectives(source.schema)).toMatchSnapshot();
  });

  it('should create a GraphQL schema from a simple local openapi file, adding limit arg', async () => {
    const handler = new OpenAPIHandler({
      name: 'Example OAS3',
      config: {
        source: resolve(__dirname, './fixtures/example_oas_combined.json'),
      },
      pubsub: new PubSub(),
      cache: new InMemoryLRUCache(),
      store: new MeshStore('openapi', new InMemoryStoreStorageAdapter(), {
        readonly: false,
        validate: false,
      }),
    });
    const source = await handler.getMeshSource();
    expect(
      source.schema
        .getQueryType()
        .getFields()
        .getAllCars.args.some(it => it.name === 'limit')
    ).toBe(true);
  });

  it('should create a GraphQL schema from a simple local openapi file, without limit arg', async () => {
    const handler = new OpenAPIHandler({
      name: 'Example OAS3',
      config: {
        source: resolve(__dirname, './fixtures/example_oas_combined.json'),
        addLimitArgument: false,
      },
      pubsub: new PubSub(),
      cache: new InMemoryLRUCache(),
      store: new MeshStore('openapi', new InMemoryStoreStorageAdapter(), {
        readonly: false,
        validate: false,
      }),
    });
    const source = await handler.getMeshSource();
    expect(
      source.schema
        .getQueryType()
        .getFields()
        .getAllCars.args.some(it => it.name === 'limit')
    ).toBe(false);
  });
});
