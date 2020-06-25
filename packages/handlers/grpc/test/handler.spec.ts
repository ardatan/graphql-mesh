import { join } from 'path';
import { GraphQLSchema } from 'graphql';

import handler from '../src';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { EventEmitter } from 'events';
import { Hooks } from '@graphql-mesh/types';

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
    const hooks = new EventEmitter() as Hooks;
    const config = {
      endpoint: 'localhost',
      serviceName: 'Example',
      packageName,
      protoFilePath: {
        file,
        load: { includeDirs: [join(__dirname, './fixtures/proto-tests')] },
      },
    };
    const { schema } = await handler.getMeshSource({ name: Date.now().toString(), config, cache, hooks });
    expect(schema).toBeInstanceOf(GraphQLSchema);
  });
});
