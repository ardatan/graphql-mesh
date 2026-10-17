import { buildSchema } from 'graphql';
import { createGatewayRuntime } from '@graphql-hive/gateway-runtime';
import { describe, expect, it, jest } from '@jest/globals';
import { createEntityInvalidationWebhook } from '../src/webhook.js';

const body = JSON.stringify({
  v: 1,
  source: 'Assets',
  entityType: 'Equipment',
  scope: 'public',
  identities: ['a'],
  event: { id: 'event', version: 1 },
});
// #9658: real Fetch body states remain fixed empty responses without dispatch.
describe('webhook body ownership (#9658)', () => {
  it.each(['locked', 'consumed'] as const)(
    'contains an authenticator %s original body',
    async mode => {
      const invalidate = jest.fn(async () => {});
      const request = new Request('http://gateway/internal/entity-invalidate', {
        method: 'POST',
        body,
      });
      const plugin = createEntityInvalidationWebhook({
        invalidate,
        authenticate: async req => {
          if (mode === 'locked') req.body!.getReader();
          else await req.text();
          return true;
        },
      });
      let response: Response | undefined;
      await expect(
        (plugin.onRequest as any)({
          request,
          fetchAPI: { Response },
          endResponse: (value: Response) => {
            response = value;
          },
        }),
      ).resolves.toBeUndefined();
      expect(response!.status).toBe(400);
      expect(await response!.text()).toBe('');
      expect(invalidate).not.toHaveBeenCalled();
    },
  );
  it('authenticates a clone through actual Hive while preserving the original payload', async () => {
    const invalidate = jest.fn(async () => {});
    const schema = buildSchema('type Query {ok:Boolean}');
    const runtime = createGatewayRuntime({
      subgraph: schema,
      logging: false,
      plugins: () => [
        createEntityInvalidationWebhook({
          invalidate,
          authenticate: async request => (await request.clone().text()) === body,
        }),
      ],
    });
    try {
      const response = await runtime.fetch(
        new Request('http://gateway/internal/entity-invalidate', { method: 'POST', body }),
      );
      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
      expect(invalidate).toHaveBeenCalledTimes(1);
    } finally {
      await runtime[Symbol.asyncDispose]();
    }
  });
});
