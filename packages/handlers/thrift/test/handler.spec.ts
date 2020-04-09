import thriftHandler from '../src';
import { Hooks } from '@graphql-mesh/types';
import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';
import { join } from 'path';
import { printSchema } from 'graphql';
import { EventEmitter } from 'events';

describe('thrift', () => {
  it('should create a GraphQL Schema from Thrift IDL', async () => {
    const source = await thriftHandler.getMeshSource({
      name: 'Twitter',
      config: {
        idl: join(__dirname, './fixtures/twitter.thrift'),
        hostName: 'localhost',
        port: 4444,
        path: '/twitter',
        serviceName: 'twitter-service',
      },
      cache: new InMemoryLRUCache(),
      hooks: new EventEmitter() as Hooks,
    });
    expect(printSchema(source.schema)).toMatchSnapshot();
  });
});
