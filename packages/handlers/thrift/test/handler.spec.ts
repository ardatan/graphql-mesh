/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-extraneous-dependencies */
import ThriftHandler from '../src';
import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import { join } from 'path';
import { printSchema } from 'graphql';
import { PubSub, DefaultLogger } from '@graphql-mesh/utils';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { fetch as fetchFn } from '@whatwg-node/fetch';

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
      baseDir: __dirname,
      logger: new DefaultLogger('TEST'),
      importFn: m => import(m),
    });
    const source = await thriftHandler.getMeshSource({
      fetchFn,
    });
    expect(printSchema(source.schema)).toMatchSnapshot();
  });
});
