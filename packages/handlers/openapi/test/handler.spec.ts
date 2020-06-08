import { Hooks } from '@graphql-mesh/types';
import { printSchema } from 'graphql';
import handler from '../src';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { resolve } from 'path';
import { EventEmitter } from 'events';

describe('openapi', () => {
  it('should create a GraphQL schema from a simple local swagger file', async () => {
    const source = await handler.getMeshSource({
      name: 'Instagram',
      config: {
        source: resolve(__dirname, './fixtures/instagram.json'),
      },
      hooks: new EventEmitter() as Hooks,
      cache: new InMemoryLRUCache(),
    });

    expect(printSchema(source.schema)).toMatchSnapshot();
  });
});
