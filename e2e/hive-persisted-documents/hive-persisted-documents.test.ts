import { createTenv } from '@e2e/tenv';

const { service, serve } = createTenv(__dirname);

it('executes persisted operations correctly', async () => {
  const upstream = await service('upstream');
  const hiveCdn = await service('hive-cdn');
  const { port } = await serve({
    args: ['proxy'],
    env: {
      UPSTREAM_PORT: upstream.port,
      HIVE_CDN_PORT: hiveCdn.port,
    },
  });
  const res = await fetch(`http://localhost:${port}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      documentId: 'foo',
    }),
  });
  const resJson = await res.json();
  expect(resJson).toEqual({
    data: {
      foo: 'FOO',
    },
  });
});
