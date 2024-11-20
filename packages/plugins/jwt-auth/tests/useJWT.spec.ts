import { createSchema, createYoga, type Plugin } from 'graphql-yoga';
import jwt from 'jsonwebtoken';
import { createGatewayRuntime, useCustomFetch } from '@graphql-hive/gateway-runtime';
import {
  createInlineSigningKeyProvider,
  type JWTExtendContextFields,
} from '@graphql-yoga/plugin-jwt';
import useJWTAuth, { useForwardedJWT } from '../src/index';

describe('useExtractedJWT', () => {
  it('full flow with extraction on Yoga subgraph', async () => {
    const upstream = createYoga<{ jwt?: JWTExtendContextFields }>({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String
          }
        `,
        resolvers: {
          Query: {
            hello: (_, args, context) => `Hi, user ${context.jwt?.payload.sub}`,
          },
        },
      }),
      plugins: [useForwardedJWT({})],
      logging: false,
    });

    const secret = 'topsecret';
    const serveRuntime = createGatewayRuntime({
      proxy: {
        endpoint: 'https://example.com/graphql',
      },
      plugins: () => [
        useCustomFetch(upstream.fetch),
        useJWTAuth({
          forward: {
            payload: true,
            token: true,
          },
          signingKeyProviders: [createInlineSigningKeyProvider(secret)],
        }),
      ],
      logging: false,
    });

    const token = jwt.sign({ sub: '123' }, secret, {});

    const response = await serveRuntime.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
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
    expect(body.data?.hello).toBe('Hi, user 123');
  });
});

describe('useJWTAuth', () => {
  describe('forwarding of token and payload to the upstream, using extensions', () => {
    const requestTrackerPlugin = {
      onParams: jest.fn((() => {}) as Plugin['onParams']),
    };
    const upstream = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String
          }
        `,
        resolvers: {
          Query: {
            hello: () => 'world',
          },
        },
      }),
      plugins: [requestTrackerPlugin],
      logging: false,
    });
    beforeEach(() => {
      requestTrackerPlugin.onParams.mockClear();
    });

    it.only('should passthrough jwt token, jwt payload, and signature to the upstream api calls', async () => {
      const secret = 'topsecret';
      const serveRuntime = createGatewayRuntime({
        proxy: {
          endpoint: 'https://example.com/graphql',
        },
        plugins: () => [
          useCustomFetch(upstream.fetch),
          useJWTAuth({
            forward: {
              payload: true,
              token: true,
            },
            signingKeyProviders: [createInlineSigningKeyProvider(secret)],
          }),
        ],
        logging: true,
      });

      const token = jwt.sign({ sub: '123' }, secret, {});

      const response = await serveRuntime.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
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
      expect(requestTrackerPlugin.onParams).toHaveBeenCalledTimes(2);
      const extensions = requestTrackerPlugin.onParams.mock.calls[1][0].params.extensions;
      expect(extensions.jwt.token.value).toBe(token);
      expect(extensions.jwt.token.prefix).toBe('Bearer');
      expect(extensions.jwt.payload).toMatchObject({
        sub: '123',
      });
    });
  });
});
