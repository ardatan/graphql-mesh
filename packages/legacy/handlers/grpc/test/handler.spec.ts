import { join } from 'path';
import { buildSchema, GraphQLSchema, validateSchema } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import type { KeyValueCache, YamlConfig } from '@graphql-mesh/types';
import { defaultImportFn, PubSub } from '@graphql-mesh/utils';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { dummyLogger as logger } from '../../../../testing/dummyLogger';
import GrpcHandler from '../src/index.js';

describe('gRPC Handler', () => {
  let pubsub: PubSub;
  let store: MeshStore;
  beforeEach(() => {
    pubsub = new PubSub();
    store = new MeshStore('grpc-test', new InMemoryStoreStorageAdapter(), {
      readonly: false,
      validate: false,
    });
  });
  afterEach(() => {
    pubsub.publish('destroy', undefined);
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
    ['Enums', 'enums.proto'],
    ['Input bug 5880', 'input_bug_5880.proto'],
  ])('Interpreting Protos', (name, file) => {
    test(`should load the ${name} proto`, async () => {
      const config: YamlConfig.GrpcHandler = {
        endpoint: 'localhost',
        source: {
          file: join(__dirname, './fixtures/proto-tests', file),
          load: { includeDirs: [join(__dirname, './fixtures/proto-tests')] },
        },
      };
      using cache = new InMemoryLRUCache();
      const handler = new GrpcHandler({
        name,
        config,
        cache,
        pubsub,
        store,
        logger,
        importFn: defaultImportFn,
        baseDir: __dirname,
      });
      const { schema } = await handler.getMeshSource();

      expect(schema).toBeInstanceOf(GraphQLSchema);
      expect(validateSchema(schema)).toHaveLength(0);
      const printedSDL = printSchemaWithDirectives(schema);
      expect(printedSDL).toMatchSnapshot();
      const loadedFromPrintedSDL = buildSchema(printedSDL, { noLocation: true });
      expect(validateSchema(loadedFromPrintedSDL)).toHaveLength(0);
    });
  });

  describe('Load proto with prefixQueryMethod and selectQueryOrMutationField', () => {
    test(`should load the retrieve-movie.proto with prefixQueryMethod`, async () => {
      const file = 'retrieve-movie.proto';
      const config: YamlConfig.GrpcHandler = {
        endpoint: 'localhost',
        source: {
          file: join(__dirname, './fixtures/proto-tests', file),
          load: { includeDirs: [join(__dirname, './fixtures/proto-tests')] },
        },
        prefixQueryMethod: ['get', 'list', 'retrieve'],
      };
      using cache = new InMemoryLRUCache();
      const handler = new GrpcHandler({
        name: 'prefixQueryMethod',
        config,
        cache,
        pubsub,
        store,
        logger,
        importFn: defaultImportFn,
        baseDir: __dirname,
      });

      const { schema } = await handler.getMeshSource();

      expect(schema).toBeInstanceOf(GraphQLSchema);
      expect(validateSchema(schema)).toHaveLength(0);
      expect(printSchemaWithDirectives(schema)).toContain('AnotherExample_RetrieveMovies');
      expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
    });
    test(`should load the retrieve-movie.proto with selectQueryOrMutationField`, async () => {
      const file = 'retrieve-movie.proto';
      const config: YamlConfig.GrpcHandler = {
        endpoint: 'localhost',
        source: {
          file: join(__dirname, './fixtures/proto-tests', file),
          load: { includeDirs: [join(__dirname, './fixtures/proto-tests')] },
        },
        selectQueryOrMutationField: [
          {
            fieldName: '*RetrieveMovies',
            type: 'Query',
          },
        ],
      };
      using cache = new InMemoryLRUCache();
      const handler = new GrpcHandler({
        name: 'selectQueryOrMutationField',
        config,
        cache,
        pubsub,
        store,
        logger,
        importFn: defaultImportFn,
        baseDir: __dirname,
      });

      const { schema } = await handler.getMeshSource();

      expect(schema).toBeInstanceOf(GraphQLSchema);
      expect(validateSchema(schema)).toHaveLength(0);
      expect(printSchemaWithDirectives(schema)).toContain('AnotherExample_RetrieveMovies');
      expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
    });
  });
});
