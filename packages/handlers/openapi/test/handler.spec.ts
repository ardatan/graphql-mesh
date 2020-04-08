import { EventEmitter } from 'tsee';
import { printSchema } from 'graphql';
import handler from '../src';
import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';
import { resolve } from 'path';

describe('openapi', () => {
  it('should create a GraphQL schema from a simple local swagger file', async () => {
    const source = await handler.getMeshSource({
      name: 'Instagram',
      config: {
        source: resolve(__dirname, './fixtures/instagram.json'),
      },
      hooks: new EventEmitter(),
      cache: new InMemoryLRUCache(),
    });

    expect(printSchema(source.schema)).toMatchSnapshot();
  });
});
