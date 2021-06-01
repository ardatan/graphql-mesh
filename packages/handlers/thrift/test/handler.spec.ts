import ThriftHandler from '../src';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { join } from 'path';
import { printSchema } from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';

describe('thrift', () => {
  it('should create a GraphQL Schema from Thrift IDL', async () => {
    const thriftHandler = new ThriftHandler({
      name: 'Twitter',
      config: {
        idl: join(__dirname, './fixtures/twitter.thrift'),
        hostName: 'localhost',
        port: 4444,
        path: '/twitter',
        serviceName: 'twitter-service',
      },
      cache: new InMemoryLRUCache(),
      pubsub: new PubSub(),
      store: new MeshStore('.mesh', new InMemoryStoreStorageAdapter(), { readonly: false, validate: false }),
    });
    const source = await thriftHandler.getMeshSource();
    expect(printSchema(source.schema)).toMatchSnapshot();
  });
});
