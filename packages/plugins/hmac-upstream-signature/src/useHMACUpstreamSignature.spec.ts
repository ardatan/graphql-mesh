/* eslint-disable @typescript-eslint/no-floating-promises */
// eslint-disable-next-line import/no-nodejs-modules
import { createHmac } from 'node:crypto';
import { createSchema, createYoga, type Plugin } from 'graphql-yoga';
import { createServeRuntime, useCustomFetch } from '@graphql-mesh/serve-runtime';
import {
  defaultParamsSerializer,
  useHmacSignatureValidation,
  useHmacUpstreamSignature,
} from './index';

describe('useHmacSignatureValidation', () => {
  test('should throw when header is missing or invalid', async () => {
    const serveRuntime = createServeRuntime({
      proxy: {
        endpoint: 'https://example.com/graphql',
      },
      plugins: () => [
        useHmacSignatureValidation({
          secret: 'topSecret',
        }),
      ],
      logging: false,
    });

    let response = await serveRuntime.fetch('http://localhost:4000/graphql', {
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

    expect(await response.json()).toMatchInlineSnapshot(`
{
  "errors": [
    {
      "extensions": {},
      "message": "Unexpected error.",
    },
  ],
}
`);
    response = await serveRuntime.fetch('http://localhost:4000/graphql', {
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
        extensions: {
          'hmac-signature': 'invalid',
        },
      }),
    });

    expect(await response.json()).toMatchInlineSnapshot(`
{
  "errors": [
    {
      "extensions": {},
      "message": "Unexpected error.",
    },
  ],
}
`);
  });

  test('should build a valid hmac and validate it correctly in a Yoga setup', async () => {
    const sharedSecret = 'topSecret';
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
      plugins: [
        useHmacSignatureValidation({
          secret: sharedSecret,
        }),
      ],
      logging: false,
    });
    const serveRuntime = createServeRuntime({
      proxy: {
        endpoint: 'https://example.com/graphql',
      },
      plugins: () => [
        // @ts-expect-error - signature mismatch
        useCustomFetch(upstream.fetch),
        {
          onSubgraphExecute(payload) {
            payload.executionRequest.extensions ||= {};
            payload.executionRequest.extensions.addedToPayload = true;
          },
        },
        useHmacUpstreamSignature({
          secret: sharedSecret,
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
  });
});

describe('useHmacUpstreamSignature', () => {
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

  it('should build valid hmac signature based on the request body even when its modified in other plugins', async () => {
    const secret = 'secret';
    const serveRuntime = createServeRuntime({
      proxy: {
        endpoint: 'https://example.com/graphql',
      },
      plugins: () => [
        // @ts-expect-error - signature mismatch
        useCustomFetch(upstream.fetch),
        {
          onSubgraphExecute(payload) {
            payload.executionRequest.extensions ||= {};
            payload.executionRequest.extensions.addedToPayload = true;
          },
        },
        useHmacUpstreamSignature({
          secret,
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
    expect(requestTrackerPlugin.onParams).toHaveBeenCalledTimes(2);
    const upstreamReqParams = requestTrackerPlugin.onParams.mock.calls[1][0].params;
    const upstreamExtensions = upstreamReqParams.extensions;
    expect(upstreamExtensions['hmac-signature']).toBeDefined();
    const upstreamReqBody = defaultParamsSerializer(upstreamReqParams);
    expect(upstreamReqParams.extensions?.addedToPayload).toBeTruthy();
    // Signature on the upstream call should match when manually validated
    expect(upstreamExtensions['hmac-signature']).toEqual(
      createHmac('sha256', secret).update(upstreamReqBody).digest('base64'),
    );
  });

  it('should include hmac signature based on the request body', async () => {
    const secret = 'secret';
    const serveRuntime = createServeRuntime({
      proxy: {
        endpoint: 'https://example.com/graphql',
      },
      plugins: () => [
        // @ts-expect-error - signature mismatch
        useCustomFetch(upstream.fetch),
        useHmacUpstreamSignature({
          secret,
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
    expect(requestTrackerPlugin.onParams).toHaveBeenCalledTimes(2);
    const upstreamReqParams = requestTrackerPlugin.onParams.mock.calls[1][0].params;
    const upstreamExtensions = upstreamReqParams.extensions;
    const upstreamHmacExtension = upstreamExtensions['hmac-signature'];
    expect(upstreamHmacExtension).toBeDefined();
    const upstreamReqBody = defaultParamsSerializer(upstreamReqParams);
    // Signature on the upstream call should match when manually validated
    expect(upstreamHmacExtension).toEqual(
      createHmac('sha256', secret).update(upstreamReqBody).digest('base64'),
    );
  });

  it('should allow to customize header name', async () => {
    const secret = 'secret';
    const customExtensionName = 'custom-hmac-signature';
    const serveRuntime = createServeRuntime({
      proxy: {
        endpoint: 'https://example.com/graphql',
      },
      plugins: () => [
        // @ts-expect-error - signature mismatch
        useCustomFetch(upstream.fetch),
        useHmacUpstreamSignature({
          secret,
          extensionName: customExtensionName,
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
    expect(requestTrackerPlugin.onParams).toHaveBeenCalledTimes(2);
    const upstreamReqParams = requestTrackerPlugin.onParams.mock.calls[1][0].params;
    const upstreamExtensions = upstreamReqParams.extensions;
    const upstreamHmacExtension = upstreamExtensions[customExtensionName];
    expect(upstreamHmacExtension).toBeDefined();
    const upstreamReqBody = defaultParamsSerializer(upstreamReqParams);
    // Signature on the upstream call should match when manually validated
    expect(upstreamHmacExtension).toEqual(
      createHmac('sha256', secret).update(upstreamReqBody).digest('base64'),
    );
  });

  it('should allow to filter upstream calls', async () => {
    const secret = 'secret';
    const serveRuntime = createServeRuntime({
      proxy: {
        endpoint: 'https://example.com/graphql',
      },
      plugins: () => [
        // @ts-expect-error - signature mismatch
        useCustomFetch(upstream.fetch),
        useHmacUpstreamSignature({
          secret,
          shouldSign: () => {
            return false;
          },
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
    expect(requestTrackerPlugin.onParams).toHaveBeenCalledTimes(2);
    expect(
      requestTrackerPlugin.onParams.mock.calls[0][0].params.extensions?.['hmac-signature'],
    ).toBeFalsy();
    expect(
      requestTrackerPlugin.onParams.mock.calls[1][0].params.extensions?.['hmac-signature'],
    ).toBeFalsy();
  });
});
