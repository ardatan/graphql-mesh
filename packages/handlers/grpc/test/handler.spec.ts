import { join } from 'path';
import { GraphQLSchema, printSchema, validateSchema } from 'graphql';

import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import { PubSub } from '@graphql-mesh/utils';
import GrpcHandler from '../src';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { DefaultLogger } from '@graphql-mesh/utils';
import type { YamlConfig } from '@graphql-mesh/types';

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
    const cache = new InMemoryLRUCache();
    const pubsub = new PubSub();
    const config: YamlConfig.GrpcHandler = {
      endpoint: 'localhost',
      protoFilePath: {
        file: join(__dirname, './fixtures/proto-tests', file),
        load: { includeDirs: [join(__dirname, './fixtures/proto-tests')] },
      },
    };
    const store = new MeshStore(name, new InMemoryStoreStorageAdapter(), {
      readonly: false,
      validate: false,
    });
    const logger = new DefaultLogger(name);
    const handler = new GrpcHandler({
      name: Date.now().toString(),
      config,
      cache,
      pubsub,
      store,
      logger,
      importFn: m => import(m),
      baseDir: __dirname,
    });

    const { schema } = await handler.getMeshSource();

    expect(schema).toBeInstanceOf(GraphQLSchema);
    expect(validateSchema(schema)).toHaveLength(0);
    expect(printSchema(schema)).toMatchSnapshot();
  });
});

describe('Load proto with prefixQueryMethod', () => {
  test(`should load the retrieve-movie.proto`, async () => {
    const name = 'retrieve-movie';
    const file = 'retrieve-movie.proto';

    const cache = new InMemoryLRUCache();
    const pubsub = new PubSub();
    const config: YamlConfig.GrpcHandler = {
      endpoint: 'localhost',
      protoFilePath: {
        file: join(__dirname, './fixtures/proto-tests', file),
        load: { includeDirs: [join(__dirname, './fixtures/proto-tests')] },
      },
      prefixQueryMethod: ['get', 'list', 'retrieve'],
    };
    const store = new MeshStore(name, new InMemoryStoreStorageAdapter(), {
      readonly: false,
      validate: false,
    });
    const logger = new DefaultLogger(name);
    const handler = new GrpcHandler({
      name: Date.now().toString(),
      config,
      cache,
      pubsub,
      store,
      logger,
      importFn: m => import(m),
      baseDir: __dirname,
    });

    const { schema } = await handler.getMeshSource();

    expect(schema).toBeInstanceOf(GraphQLSchema);
    expect(validateSchema(schema)).toHaveLength(0);
    expect(printSchema(schema)).toContain('AnotherExample_RetrieveMovies');
    expect(printSchema(schema)).toMatchSnapshot();
  });
});
