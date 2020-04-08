import thriftHandler from '../src';
import { Hooks } from '@graphql-mesh/types';
import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';
import { join } from 'path';
import { printSchema } from 'graphql';

describe('thrift', () => {
  it('should create a GraphQL Schema from Thrift IDL', async () => {
    const source = await thriftHandler.getMeshSource({
      name: 'Twitter',
      config: {
        hostName: 'localhost',
        port: 4444,
        path: '/twitter',
        serviceName: 'twitter',
        idl: join(__dirname, './fixtures/twitter.thrift'),
      },
      cache: new InMemoryLRUCache(),
      hooks: new Hooks(),
    });
    expect(printSchema(source.schema)).toMatchSnapshot();
  });
});
