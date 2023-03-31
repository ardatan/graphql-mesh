/* eslint-disable import/no-nodejs-modules */

/* eslint-disable import/no-extraneous-dependencies */
import { join } from 'path';
import { printSchema } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { DefaultLogger, PubSub } from '@graphql-mesh/utils';
import { fetch as fetchFn } from '@whatwg-node/fetch';
import ThriftHandler from '../src/index.js';

describe('thrift', () => {
  const schemas: Record<
    string,
    {
      idl: string;
      path: string;
      serviceName: string;
    }
  > = {
    Twitter: {
      idl: 'twitter.thrift',
      path: '/twitter',
      serviceName: 'twitter-service',
    },
    Calc: {
      idl: 'calc.thrift',
      path: '/thrift-with-imports',
      serviceName: 'Calculator',
    },
  };
  for (const schemaName in schemas) {
    it(schemaName, async () => {
      const schemaObj = schemas[schemaName];
      const thriftHandler = new ThriftHandler({
        name: schemaName,
        config: {
          idl: join(__dirname, './fixtures/' + schemaObj.idl),
          hostName: 'localhost',
          port: 4444,
          path: schemaObj.path,
          serviceName: schemaObj.serviceName,
        },
        cache: new InMemoryLRUCache(),
        pubsub: new PubSub(),
        store: new MeshStore('.mesh', new InMemoryStoreStorageAdapter(), {
          readonly: false,
          validate: false,
        }),
        baseDir: __dirname,
        logger: new DefaultLogger('TEST'),
        importFn: m => import(m),
      });
      const source = await thriftHandler.getMeshSource({
        fetchFn,
      });
      expect(printSchema(source.schema)).toMatchSnapshot();
    });
  }
});
