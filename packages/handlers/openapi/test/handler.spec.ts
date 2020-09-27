import { printSchema } from 'graphql';
import OpenAPIHandler from '../src';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { resolve } from 'path';
import { PubSub } from 'graphql-subscriptions';

describe('openapi', () => {
  it('should create a GraphQL schema from a simple local swagger file', async () => {
    const handler = new OpenAPIHandler({
      name: 'Instagram',
      config: {
        source: resolve(__dirname, './fixtures/instagram.json'),
      },
      pubsub: new PubSub(),
      cache: new InMemoryLRUCache(),
    });
    const source = await handler.getMeshSource();

    expect(printSchema(source.schema)).toMatchSnapshot();
  });
});
