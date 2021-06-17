import { join } from 'path';
import { GraphQLSchema, printSchema, validateSchema } from 'graphql';

import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { PubSub } from 'graphql-subscriptions';
import GrpcHandler from '../src';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { DefaultLogger } from '@graphql-mesh/runtime';
import { YamlConfig } from '@graphql-mesh/types';

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
])('Interpreting Protos', (name, file) => {
  test(`should load the ${name} proto`, async () => {
    const cache = new InMemoryLRUCache();
    const pubsub = new PubSub();
    const config: YamlConfig.GrpcHandler = {
      endpoint: 'localhost',
      protoFilePath: {
        file,
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
    });

    const { schema } = await handler.getMeshSource();

    expect(schema).toBeInstanceOf(GraphQLSchema);
    expect(validateSchema(schema)).toHaveLength(0);
    expect(printSchema(schema)).toMatchSnapshot();
  });
});
