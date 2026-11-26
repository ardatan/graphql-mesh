import { getOperationAST, GraphQLSchema, parse } from 'graphql';
import { bench, describe, expect, vi } from 'vitest';
import { ApolloGateway, LocalGraphQLDataSource } from '@apollo/gateway';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import { getStitchedSchemaFromSupergraphSdl } from '@graphql-tools/federation';
import { fakePromise, handleMaybePromise } from '@whatwg-node/promise-helpers';
import { benchConfig } from '../benchConfig';
import { composeLocalSchemas } from './fixtures/composeLocalSchemas';
import { exampleOperation } from './fixtures/exampleOperation';
import { schema as accounts } from './fixtures/services/accounts/server';
import { schema as inventory } from './fixtures/services/inventory/server';
import { schema as products } from './fixtures/services/products/server';
import { schema as reviews } from './fixtures/services/reviews/server';
import monolith from './monolith';

function memoize1<T extends (...args: any) => any>(fn: T): T {
  const memoize1cache = new Map();
  return function memoized(a1: Parameters<T>[0]): ReturnType<T> {
    const cachedValue = memoize1cache.get(a1);
    if (cachedValue === undefined) {
      const newValue = fn(a1);
      memoize1cache.set(a1, newValue);
      return newValue;
    }

    return cachedValue;
  } as T;
}

describe('Federation', async () => {
  const { query, operationName, result } = exampleOperation;
  const services: Record<string, GraphQLSchema> = {
    accounts,
    inventory,
    products,
    reviews,
  };
  const memoizedParse = memoize1(parse);

  // Only if you want to see the latency that the gateway adds
  bench.skip(
    'Monolith',
    () =>
      normalizedExecutor({
        schema: monolith,
        document: memoizedParse(query),
        operationName,
        contextValue: {},
      }) as Promise<void>,
  );

  const supergraphSdl = await composeLocalSchemas(services);
  type ApolloGWExecutorOpts = Parameters<ApolloGateway['executor']>[0];
  const dummyLogger: ApolloGWExecutorOpts['logger'] = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const dummyCache: ApolloGWExecutorOpts['cache'] = {
    get: () => fakePromise(undefined),
    set: () => fakePromise(undefined),
    delete: () => fakePromise(true),
  };
  const parsedQuery = parse(query, { noLocation: true });
  const operationAST = getOperationAST(parsedQuery, operationName);

  if (!operationAST) {
    throw new Error(`Operation ${operationName} not found`);
  }

  const apolloGW = new ApolloGateway({
    logger: dummyLogger,
    supergraphSdl,
    buildService({ name }) {
      const lowercasedName = name.toLowerCase();
      const service = services[lowercasedName];
      if (!service) {
        throw new Error(`Service ${name} not found`);
      }
      return new LocalGraphQLDataSource(service);
    },
  });

  const { schema: apolloGWSchema, executor: apolloGWExecutor } = await apolloGW.load();

  const schemaHash: string & { __fauxpaque: 'SchemaHash' } = Object.assign(
    new String(supergraphSdl) as string,
    { __fauxpaque: 'SchemaHash' } as const,
  );

  bench(
    'Apollo Gateway',
    () =>
      handleMaybePromise(
        () =>
          apolloGWExecutor({
            document: parsedQuery,
            operationName,
            request: {
              query,
            },
            operation: operationAST,
            metrics: {},
            overallCachePolicy: {},
            schemaHash,
            queryHash: query,
            source: query,
            cache: dummyCache,
            schema: apolloGWSchema,
            logger: dummyLogger,
            context: {},
          }),
        response => {
          expect(response).toEqual(result);
        },
      ),
    benchConfig,
  );

  const stitchedSchema = getStitchedSchemaFromSupergraphSdl({
    supergraphSdl,
    onSubschemaConfig(subschemaConfig) {
      const lowercasedName = subschemaConfig.name.toLowerCase();
      const service = services[lowercasedName];
      if (!service) {
        throw new Error(`Service ${subschemaConfig.name} not found`);
      }
      subschemaConfig.executor = createDefaultExecutor(service);
    },
  });

  bench(
    'Stitching',
    () =>
      handleMaybePromise(
        () =>
          normalizedExecutor({
            schema: stitchedSchema,
            document: parsedQuery,
            operationName,
            contextValue: {},
          }),
        response => {
          expect(response).toEqual(result);
        },
      ),
    benchConfig,
  );
});
