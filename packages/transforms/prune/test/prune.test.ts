/* eslint-disable import/no-extraneous-dependencies */
import { buildSchema, printSchema } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import { defaultImportFn, DefaultLogger, PubSub } from '@graphql-mesh/utils';
import PruneTransform from '../src';

describe('Prune', () => {
  const apiName = 'test';
  const baseDir = __dirname;
  const cache = new InMemoryLRUCache();
  const pubsub = new PubSub();
  const logger = new DefaultLogger();
  const importFn = defaultImportFn;
  it('should skip specified types while pruning', () => {
    const transform = new PruneTransform({
      apiName,
      baseDir,
      cache,
      pubsub,
      logger,
      importFn,
      config: {
        skipPruning: ['Mutation'],
      },
    });
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: String
      }
      type Mutation
    `);
    const prunedSchema = transform.transformSchema(schema);
    expect(prunedSchema.getType('Query')).toBeDefined();
    expect(prunedSchema.getType('Mutation')).toBeDefined();
  });
});
