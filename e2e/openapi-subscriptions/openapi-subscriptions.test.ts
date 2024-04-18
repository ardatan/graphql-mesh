import { createTenv } from '@e2e/tenv';

const { compose, service, serve } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
    services: [await service('api')],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it('should listen for webhooks', async () => {
  const { target } = await compose({ target: 'graphql', services: [await service('api')] });
  const { execute, port } = await serve({ fusiongraph: target });

  const res = await execute({
    query: /* GraphQL */ `
      mutation StartWebhook($url: URL!) {
        post_streams(input: { callbackUrl: $url }) {
          subscriptionId
        }
      }
    `,
    variables: {
      url: `http://0.0.0.0:${port.toString()}/callback`,
    },
  });

  const subscriptionId = res.data?.post_streams?.subscriptionId;

  expect(subscriptionId).toBeTruthy();

  const sub = await fetch(`http://0.0.0.0:${port}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
    },
    body: JSON.stringify({
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
    }),
  });

  expect(sub.ok).toBeTruthy();

  const msgs: string[] = [];
  for await (const chunk of sub.body) {
    const parts = Buffer.from(chunk)
      .toString('utf8')
      .split('\n\n')
      .filter(msg => msg.includes('event: next'));
    msgs.push(...parts);
    if (msgs.length === 3) {
      break;
    }
  }

  expect(msgs).toMatchInlineSnapshot(`
[
  "event: next
data: {"data":{"onData":{"userData":"RANDOM_DATA"}}}",
  "event: next
data: {"data":{"onData":{"userData":"RANDOM_DATA"}}}",
  "event: next
data: {"data":{"onData":{"userData":"RANDOM_DATA"}}}",
]
`);
});
