import { useOperationHeaders } from '@graphql-mesh/plugin-operation-headers';
import { wrapFetchWithPlugins } from '@graphql-mesh/runtime';

describe('Operation Headers', () => {
  it('works', async () => {
    const wrappedFetch = wrapFetchWithPlugins([
      {
        onFetch({ setFetchFn }) {
          setFetchFn(async (url, opts) => {
            const req = new Request(url, opts);
            if (req.headers.get('Authorization') !== 'Bearer test') {
              return new Response('Unauthorized', { status: 401 });
            }
            return Response.json({ data: 'test' });
          });
        },
      },
      useOperationHeaders(({ context }) => ({
        Authorization: `Bearer ${context.headers['x-auth-token']}`,
      })),
    ]);
    const authorizedRes = await wrappedFetch(
      'http://localhost:3000',
      {},
      {
        headers: {
          'x-auth-token': 'test',
        },
      },
    );
    expect(authorizedRes.status).toBe(200);
    const authorizedResJson = await authorizedRes.json();
    expect(authorizedResJson).toEqual({ data: 'test' });

    const unauthorizedRes = await wrappedFetch(
      'http://localhost:3000',
      {},
      {
        headers: {
          'x-auth-token': 'wrong-token',
        },
      },
    );
    expect(unauthorizedRes.status).toBe(401);
    const unauthorizedResText = await unauthorizedRes.text();
    expect(unauthorizedResText).toBe('Unauthorized');
  });
});
