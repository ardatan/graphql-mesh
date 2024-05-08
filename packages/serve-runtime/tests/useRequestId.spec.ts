import { createServerAdapter, Response } from '@whatwg-node/server';
import { useRequestId } from '../src/useRequestId';

describe('useRequestId', () => {
  it('adds a request id to the response headers', async () => {
    const adapter = createServerAdapter(() => Response.json({}), {
      plugins: [useRequestId()],
    });
    const response = await adapter.fetch('http://localhost:4000/test');
    expect(response.headers.get('x-request-id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
