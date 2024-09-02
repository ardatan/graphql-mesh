import { createClient } from 'graphql-sse';
import { createTenv } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';

const { compose, service, serve } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
    services: [await service('api')],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it('should listen for webhooks', async () => {
  const { output } = await compose({ output: 'graphql', services: [await service('api')] });
  const { execute, port } = await serve({ supergraph: output });

  const res = await execute({
    query: /* GraphQL */ `
      mutation StartWebhook($url: URL!) {
        post_streams(input: { callbackUrl: $url }) {
          subscriptionId
        }
      }
    `,
    variables: {
      url: `http://localhost:${port.toString()}/callback`,
    },
  });

  const subscriptionId = res.data?.post_streams?.subscriptionId;
  expect(subscriptionId).toBeTruthy();

  const sse = createClient({
    url: `http://localhost:${port}/graphql`,
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
