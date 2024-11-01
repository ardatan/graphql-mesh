import { createSchema, createYoga } from 'graphql-yoga';

describe('useOpenTelemetry', () => {
  if (process.env.LEAK_TEST) {
    it('noop', () => {});
    return;
  }
  const mockRegisterProvider = jest.fn();
  jest.mock('@opentelemetry/sdk-trace-web', () => ({
    WebTracerProvider: jest.fn(() => ({ register: mockRegisterProvider })),
  }));
  const {
    createGatewayRuntime,
    useCustomFetch,
  }: typeof import('@graphql-hive/gateway') = require('@graphql-hive/gateway');

  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('when not passing a custom provider', () => {
    it('initializes and starts a new provider', async () => {
      const { useOpenTelemetry } = await import('../src');
      const upstream = createYoga({
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              hello: String
            }
          `,
          resolvers: {
            Query: {
              hello: () => 'World',
            },
          },
        }),
        logging: false,
      });

      await using serveRuntime = createGatewayRuntime({
        proxy: {
          endpoint: 'https://example.com/graphql',
        },
        plugins: ctx => [
          useCustomFetch(upstream.fetch),
          useOpenTelemetry({
            exporters: [],
            ...ctx,
          }),
        ],
        logging: false,
      });

      const response = await serveRuntime.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              hello
            }
          `,
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json<any>();
      expect(body.data?.hello).toBe('World');
      expect(mockRegisterProvider).toHaveBeenCalledTimes(1);
    });
  });

  describe('when passing a custom provider', () => {
    it('does not initialize a new provider and does not start the provided provider instance', async () => {
      const { useOpenTelemetry } = await import('../src');
      const upstream = createYoga({
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              hello: String
            }
          `,
          resolvers: {
            Query: {
              hello: () => 'World',
            },
          },
        }),
        logging: false,
      });

      await using serveRuntime = createGatewayRuntime({
        proxy: {
          endpoint: 'https://example.com/graphql',
        },
        plugins: ctx => [
          useCustomFetch(upstream.fetch),
          useOpenTelemetry({ initializeNodeSDK: false, ...ctx }),
        ],
        logging: false,
      });

      const response = await serveRuntime.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              hello
            }
          `,
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json<any>();
      expect(body.data?.hello).toBe('World');
      expect(mockRegisterProvider).not.toHaveBeenCalled();
    });
  });
});
