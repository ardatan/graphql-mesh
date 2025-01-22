import { createClient } from 'graphql-sse';
import { createTenv } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';

const { compose, service, gateway } = createTenv(__dirname);

it.concurrent('should compose the appropriate schema', async () => {
  const { supergraphSdl: result } = await compose({
    services: [await service('api')],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it.concurrent('should listen for webhooks', async () => {
  const { supergraphPath } = await compose({ output: 'graphql', services: [await service('api')] });
  const { hostname, execute, port } = await gateway({ supergraph: supergraphPath });

  const res = await execute({
    query: /* GraphQL */ `
      mutation StartWebhook($url: URL!) {
        post_streams(input: { callbackUrl: $url }) {
          subscriptionId
        }
      }
    `,
    variables: {
      url: `http://${hostname}:${port.toString()}/callback`,
    },
  });

  const subscriptionId = res.data?.post_streams?.subscriptionId;
  expect(subscriptionId).toBeTruthy();

  const sse = createClient({
    url: `http://${hostname}:${port}/graphql`,
    retryAttempts: 0,
    fetchFn: fetch,
  });

  const msgs: unknown[] = [];
  for await (const msg of sse.iterate({
    query: /* GraphQL */ `
      subscription ListenWebhook($subscriptionId: String!) {
        onData(subscriptionId: $subscriptionId) {
          userData
        }
      }
    `,
    variables: {
      subscriptionId,
    },
  })) {
    msgs.push(msg);
    if (msgs.length === 3) {
      break;
    }
  }

  expect(msgs).toMatchInlineSnapshot(`
[
  {
    "data": {
      "onData": {
        "userData": "RANDOM_DATA",
      },
    },
  },
  {
    "data": {
      "onData": {
        "userData": "RANDOM_DATA",
      },
    },
  },
  {
    "data": {
      "onData": {
        "userData": "RANDOM_DATA",
      },
    },
  },
]
`);
});
