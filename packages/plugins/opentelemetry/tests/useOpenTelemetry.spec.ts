import { createSchema, createYoga } from 'graphql-yoga';
import { createGatewayRuntime, useCustomFetch } from '@graphql-mesh/serve-runtime';

describe('useOpenTelemetry', () => {
  if (process.env.LEAK_TEST) {
    it('noop', () => {});
    return;
  }
  const mockStartSdk = jest.fn();
  jest.mock('@opentelemetry/sdk-node', () => ({
    NodeSDK: jest.fn(() => ({ start: mockStartSdk })),
  }));

  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('when not passing a custom sdk', () => {
    it('initializes and starts a new NodeSDK', async () => {
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
      expect(mockStartSdk).toHaveBeenCalledTimes(1);
    });
  });

  describe('when passing a custom sdk', () => {
    it('does not initialize a new NodeSDK and does not start the provided sdk instance', async () => {
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
      expect(mockStartSdk).not.toHaveBeenCalled();
    });
  });
});
