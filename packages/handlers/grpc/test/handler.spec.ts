import { join } from 'path';
import { GraphQLSchema, printSchema, validateSchema } from 'graphql';

import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { PubSub } from 'graphql-subscriptions';
import GrpcHandler from '../src';

describe.each<[string, string, string, string]>([
  ['Movie', 'Example', 'io.xtech', 'movie.proto'],
  ['Empty', 'Example', 'io.xtech', 'empty.proto'],
  ['Nested', 'Example', 'io.xtech', 'nested.proto'],
  ['With All Values', 'Example', 'io.xtech', 'allvalues.proto'],
  ['No Package Nested', 'Example', '', 'nopackage-nested.proto'],
  ['With Underscores', 'Example', 'io.xtech', 'underscores.proto'],
  ['Outside', 'Example', 'io.outside', 'outside.proto'],
  ['Custom Message', 'BamService', 'foos', 'custom-message.proto'],
])('Interpreting Protos', (name, serviceName, packageName, file) => {
  test(`should load the ${name} proto`, async () => {
    const cache = new InMemoryLRUCache();
    const pubsub = new PubSub();
    const config = {
      endpoint: 'localhost',
      serviceName,
      packageName,
      protoFilePath: {
        file,
        load: { includeDirs: [join(__dirname, './fixtures/proto-tests')] },
      },
    };
    const handler = new GrpcHandler({
      name: Date.now().toString(),
      config,
      cache,
      pubsub,
    });

    const { schema } = await handler.getMeshSource();

    expect(schema).toBeInstanceOf(GraphQLSchema);
    expect(validateSchema(schema)).toHaveLength(0);
    expect(printSchema(schema)).toMatchSnapshot();
  });
});
