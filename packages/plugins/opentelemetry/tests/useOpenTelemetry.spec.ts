import { createSchema, createYoga } from 'graphql-yoga';
import { createGatewayRuntime, useCustomFetch } from '@graphql-mesh/serve-runtime';
import { DiagLogLevel } from '@opentelemetry/api';
import type { NodeSDK } from '@opentelemetry/sdk-node';
import { useOpenTelemetry } from '../src/index';

const mockStartSdk = jest.fn();
jest.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: jest.fn(() => ({ start: mockStartSdk })),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useOpenTelemetry', () => {
  describe('when not passing a custom sdk', () => {
    it('initializes and starts a new NodeSDK', async () => {
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

      const serveRuntime = createGatewayRuntime({
        proxy: {
          endpoint: 'https://example.com/graphql',
        },
        plugins: () => [
          useCustomFetch(upstream.fetch),
          useOpenTelemetry({ diagLogLevel: DiagLogLevel.NONE }),
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

      const sdk = { start: jest.fn() } as unknown as NodeSDK;
      const serveRuntime = createGatewayRuntime({
        proxy: {
          endpoint: 'https://example.com/graphql',
        },
        plugins: () => [
          useCustomFetch(upstream.fetch),
          useOpenTelemetry({ initializeNodeSDK: false, diagLogLevel: DiagLogLevel.NONE }),
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
      expect(sdk.start).not.toHaveBeenCalled();
    });
  });
});
