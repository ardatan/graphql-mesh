/* eslint-disable import/no-extraneous-dependencies */
import { parse } from 'graphql';
import LocalforageCache from '@graphql-mesh/cache-localforage';
import JsonSchemaHandler from '@graphql-mesh/json-schema';
import BareMerger from '@graphql-mesh/merger-bare';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { MeshFetch } from '@graphql-mesh/types';
import { defaultImportFn, DefaultLogger, PubSub } from '@graphql-mesh/utils';
import { Response } from '@whatwg-node/fetch';
import { getMesh } from '../src/get-mesh';

it('should use original resolvers when possible', async () => {
  const cache = new LocalforageCache();
  const store = new MeshStore('test', new InMemoryStoreStorageAdapter(), {
    readonly: false,
    validate: false,
  });
  const baseDir = __dirname;
  const logger = new DefaultLogger('Test');
  const pubsub = new PubSub();
  const merger = new BareMerger({
    cache,
    logger,
    pubsub,
    store,
  });
  const importFn = defaultImportFn;
  const fetchFn: MeshFetch = async () =>
    Response.json({
      bar: 'baz',
    });
  const { execute } = await getMesh({
    cache,
    logger,
    pubsub,
    merger,
    fetchFn,
    sources: [
      {
        name: 'Test',
        handler: new JsonSchemaHandler({
          name: 'Test',
          baseDir,
          cache,
          store,
          pubsub,
          logger,
          importFn,
          config: {
            operations: [
              {
                type: 'Query',
                field: 'foo',
                path: '/foo',
                method: 'GET',
                responseSchema: {
                  type: 'object',
                  properties: {
                    bar: {
                      type: 'string',
                    },
                  },
                },
              },
            ],
          },
        }),
      },
    ],
    additionalTypeDefs: [
      parse(/* GraphQL */ `
        extend type Query {
          fooBar: String
        }
      `),
    ],
    additionalResolvers: {
      Query: {
        async fooBar(root, args, context, info) {
          const result = await context.Test.Query.foo({
            root,
            args,
            context,
            info,
          });
          return result.bar;
        },
      },
    },
  });
  const result = await execute(
    /* GraphQL */ `
      query {
        fooBar
      }
    `,
    {},
  );
  expect(result).toEqual({
    data: {
      fooBar: 'baz',
    },
  });
});
