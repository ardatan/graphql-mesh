/* eslint-disable import/no-nodejs-modules */
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import {
  buildSchema,
  GraphQLSchema,
  introspectionFromSchema,
  printSchema,
  validateSchema,
} from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import type { KeyValueCache, YamlConfig } from '@graphql-mesh/types';
import { defaultImportFn, DefaultLogger, PubSub } from '@graphql-mesh/utils';
import { fetch as fetchFn } from '@whatwg-node/fetch';
import GrpcHandler from '../src/index.js';

const { readFile } = fsPromises;

describe('gRPC Handler', () => {
  let cache: KeyValueCache;
  let pubsub: PubSub;
  let store: MeshStore;
  let logger: DefaultLogger;
  beforeEach(() => {
    cache = new InMemoryLRUCache();
    pubsub = new PubSub();
    store = new MeshStore('grpc-test', new InMemoryStoreStorageAdapter(), {
      readonly: false,
      validate: false,
    });
    logger = new DefaultLogger('grpc-test');
  });
  afterEach(() => {
    pubsub.publish('destroy', undefined);
  });

  it('handle graphql SDL files correctly as source', async () => {
    const sdlFilePath = './fixtures/schema.graphql';
    const handler = new GrpcHandler({
      name: 'SDLSchema',
      config: {
        source: sdlFilePath,
        endpoint: 'localhost',
      },
      baseDir: __dirname,
      cache: new InMemoryLRUCache(),
      pubsub: new PubSub(),
      store,
      importFn: defaultImportFn,
      logger,
    });
    const absoluteFilePath = join(__dirname, sdlFilePath);
    const schemaStringFromFile = await readFile(absoluteFilePath, 'utf-8');
    const schemaFromFile = buildSchema(schemaStringFromFile);
    const { schema: schemaFromHandler } = await handler.getMeshSource({
      fetchFn,
    });
    expect(introspectionFromSchema(schemaFromHandler)).toStrictEqual(
      introspectionFromSchema(schemaFromFile),
    );
  });

  describe.each<[string, string]>([
    ['Movie', 'movie.proto'],
    ['Empty', 'empty.proto'],
    ['Nested', 'nested.proto'],
    ['Import Nested', 'import-nested.proto'],
    ['With All Values', 'allvalues.proto'],
    ['No Package Nested', 'nopackage-nested.proto'],
    ['With Underscores', 'underscores.proto'],
    ['Outside', 'outside.proto'],
    ['Custom Message', 'custom-message.proto'],
    ['Custom Message2', 'custom-message-2.proto'],
    ['Comments', 'comments.proto'],
    ['Map', 'map.proto'],
  ])('Interpreting Protos', (name, file) => {
    test(`should load the ${name} proto`, async () => {
      const config: YamlConfig.GrpcHandler = {
        endpoint: 'localhost',
        source: {
          file: join(__dirname, './fixtures/proto-tests', file),
          load: { includeDirs: [join(__dirname, './fixtures/proto-tests')] },
        },
      };
      const handler = new GrpcHandler({
        name: Date.now().toString(),
        config,
        cache,
        pubsub,
        store,
        logger,
        importFn: defaultImportFn,
        baseDir: __dirname,
      });

      const { schema } = await handler.getMeshSource({ fetchFn });

      expect(schema).toBeInstanceOf(GraphQLSchema);
      expect(validateSchema(schema)).toHaveLength(0);
      expect(printSchema(schema)).toMatchSnapshot();
    });
  });

  describe('Load proto with prefixQueryMethod', () => {
    test(`should load the retrieve-movie.proto`, async () => {
      const file = 'retrieve-movie.proto';
      const config: YamlConfig.GrpcHandler = {
        endpoint: 'localhost',
        source: {
          file: join(__dirname, './fixtures/proto-tests', file),
          load: { includeDirs: [join(__dirname, './fixtures/proto-tests')] },
        },
        prefixQueryMethod: ['get', 'list', 'retrieve'],
      };
      const handler = new GrpcHandler({
        name: Date.now().toString(),
        config,
        cache,
        pubsub,
        store,
        logger,
        importFn: defaultImportFn,
        baseDir: __dirname,
      });

      const { schema } = await handler.getMeshSource({ fetchFn });

      expect(schema).toBeInstanceOf(GraphQLSchema);
      expect(validateSchema(schema)).toHaveLength(0);
      expect(printSchema(schema)).toContain('AnotherExample_RetrieveMovies');
      expect(printSchema(schema)).toMatchSnapshot();
    });
  });
});
