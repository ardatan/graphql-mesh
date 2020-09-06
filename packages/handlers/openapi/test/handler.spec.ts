import { Hooks } from '@graphql-mesh/types';
import { printSchema } from 'graphql';
import OpenAPIHandler from '../src';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { resolve } from 'path';
import { EventEmitter } from 'events';

describe('openapi', () => {
  it('should create a GraphQL schema from a simple local swagger file', async () => {
    const handler = new OpenAPIHandler({
      name: 'Instagram',
      config: {
        source: resolve(__dirname, './fixtures/instagram.json'),
      },
      hooks: new EventEmitter() as Hooks,
      cache: new InMemoryLRUCache(),
    });
    const source = await handler.getMeshSource();

    expect(printSchema(source.schema)).toMatchSnapshot();
  });
});
