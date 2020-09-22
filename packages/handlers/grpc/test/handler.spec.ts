import { join } from 'path';
import { GraphQLSchema, printSchema, validateSchema } from 'graphql';

import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { PubSub } from 'graphql-subscriptions';
import { MeshPubSub } from '@graphql-mesh/types';
import GrpcHandler from '../src';

describe.each<[string, string, string]>([
  ['Movie', 'io.xtech', 'movie.proto'],
  ['Empty', 'io.xtech', 'empty.proto'],
  ['Nested', 'io.xtech', 'nested.proto'],
  ['With All Values', 'io.xtech', 'allvalues.proto'],
  ['No Package Nested', '', 'nopackage-nested.proto'],
  ['With Underscores', 'io.xtech', 'underscores.proto'],
  ['Outide', 'io.outside', 'outside.proto'],
])('Interpreting Protos', (name, packageName, file) => {
  test(`should load the ${name} proto`, async () => {
    const cache = new InMemoryLRUCache();
    const pubsub = new PubSub() as MeshPubSub;
    const config = {
      endpoint: 'localhost',
      serviceName: 'Example',
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
