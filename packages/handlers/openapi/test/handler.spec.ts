import OpenAPIHandler from '../src';
import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import { resolve } from 'path';
import { PubSub } from '@graphql-mesh/utils';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { DefaultLogger } from '@graphql-mesh/utils';

describe('openapi', () => {
  it('should create a GraphQL schema from a simple local swagger file', async () => {
    const handler = new OpenAPIHandler({
      baseDir: __dirname,
      logger: new DefaultLogger('TEST'),
      importFn: m => import(m),
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

  it('should create a GraphQL schema from some complex local swagger file', async () => {
    const handler = new OpenAPIHandler({
      baseDir: __dirname,
      logger: new DefaultLogger('TEST'),
      importFn: m => import(m),
      name: 'Kubernetes',
      config: {
        source: resolve(__dirname, './fixtures/kubernetes.json'),
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
      baseDir: __dirname,
      logger: new DefaultLogger('TEST'),
      importFn: m => import(m),
      name: 'Example OAS3',
      config: {
        source: resolve(__dirname, './fixtures/example_oas_combined.json'),
        operationIdFieldNames: true,
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
      baseDir: __dirname,
      logger: new DefaultLogger('TEST'),
      importFn: m => import(m),
      name: 'Example OAS3',
      config: {
        source: resolve(__dirname, './fixtures/example_oas_combined.json'),
        addLimitArgument: false,
        operationIdFieldNames: true,
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
