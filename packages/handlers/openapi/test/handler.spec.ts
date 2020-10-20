import OpenAPIHandler from '../src';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { resolve } from 'path';
import { PubSub } from 'graphql-subscriptions';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

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

    expect(printSchemaWithDirectives(source.schema)).toMatchSnapshot();
  });
});
