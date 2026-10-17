import { buildSchema, execute, parse } from 'graphql';
import { createGatewayRuntime } from '@graphql-hive/gateway-runtime';
import { describe, expect, it, jest } from '@jest/globals';
import { validateEntityInvalidation } from '../src/events.js';
import { createEntityCache, EntityInvalidationInputError, type EntityRule } from '../src/index.js';
import { createMemoryEntityStore } from '../src/memory-store.js';
import { createEntityInvalidationWebhook } from '../src/webhook.js';

const schema = buildSchema(
  'type Equipment { id: ID! description: String } type Query { equipment(ids: [ID!]!): [Equipment] }',
);
const rule: EntityRule = {
  source: 'Assets',
  field: 'equipment',
  entityType: 'Equipment',
  revision: 'v1',
  ttlSeconds: 86400,
  ordering: 'key-grouped',
  isComplete: () => true, // #9658: this fixture exhausts every requested identity group.
  scope: () => 'public',
  selection: () => true,
  batch: args => ({ keys: args.ids as string[], withKeys: ids => ({ ids }) }),
  identity: row => (row as any)?.id ?? null,
};
const input = {
  source: 'Assets',
  entityType: 'Equipment',
  scope: 'public',
  identities: ['T23'],
  event: { id: 'commit', version: 2 },
};
const request = { document: parse('{ equipment(ids: ["T23"]) { id description } }') };
function fixture() {
  let clock = 0;
  let description = 'original';
  const store = createMemoryEntityStore(() => clock);
  const a = createEntityCache({ store, rules: [rule], now: () => clock });
  const b = createEntityCache({ store, rules: [rule], now: () => clock });
  const executor = jest.fn(async (req: any) =>
    execute({
      schema,
      document: req.document,
      variableValues: req.variables,
      rootValue: { equipment: ({ ids }: any) => ids.map((id: string) => ({ id, description })) },
    }),
  );
  return {
    a,
    b,
    executor,
    first: a.wrap(executor as any, 'Assets', schema),
    peer: b.wrap(executor as any, 'Assets', schema),
    set: (value: string) => {
      description = value;
    },
    advance: (ms: number) => {
      clock += ms;
    },
  };
}
// #9658: a unique event invalidates despite reordered clocks; only the same event ID is a replay.
describe('source-event entity invalidation', () => {
  it('deduplicates exact event IDs across cache instances and refreshes committed rows', async () => {
    const f = fixture();
    await f.first(request);
    f.set('committed');
    await f.a.invalidate(input);
    const changed: any = await f.peer(request);
    expect(changed.data.equipment[0].description).toBe('committed');
    await f.b.invalidate(input);
    await f.first(request);
    expect(f.executor).toHaveBeenCalledTimes(2);
  });
  it('invalidates distinct older and equal-version events instead of dropping them', async () => {
    const f = fixture();
    await f.first(request);
    for (const [id, version] of [
      ['newer', 5],
      ['equal', 5],
      ['older', 3],
    ] as const) {
      f.set(id);
      await f.b.invalidate({ ...input, event: { id, version } });
      const result: any = await f.first(request);
      expect(result.data.equipment[0].description).toBe(id);
    }
    expect(f.executor).toHaveBeenCalledTimes(4);
  });
  it('fences a concurrent pre-event fill and returns a fresh reread', async () => {
    const f = fixture();
    const original = f.executor.getMockImplementation()!;
    let entered!: () => void;
    let release!: () => void;
    const started = new Promise<void>(resolve => {
      entered = resolve;
    });
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    f.executor.mockImplementationOnce(async req => {
      const old = await original(req);
      entered();
      await gate;
      return old;
    });
    const pending = f.first(request);
    await started;
    f.set('committed');
    await f.b.invalidate(input);
    release();
    const result: any = await pending;
    expect(result.data.equipment[0].description).toBe('committed');
    expect(f.a.metrics.fencedWrites).toBe(1);
    expect(f.executor).toHaveBeenCalledTimes(2);
  });
  it('accepts an old replay after bounded replay history expires with safe extra invalidation', async () => {
    const f = fixture();
    await f.first(request);
    await f.a.invalidate(input);
    await f.peer(request);
    f.advance(3600001);
    await f.b.invalidate(input);
    await f.first(request);
    expect(f.executor).toHaveBeenCalledTimes(3);
  });
  it.each([
    null,
    { ...input, scope: '' },
    { ...input, source: 'x'.repeat(129) },
    { ...input, identities: [] },
    { ...input, identities: Array(1001).fill('T23') },
    { ...input, identities: ['x'.repeat(257)] },
    { ...input, event: { id: 'commit', version: -1 } },
    { ...input, event: { id: 'commit', version: NaN } },
    { ...input, event: { id: 3, version: 1 } },
    { ...input, identities: undefined },
  ])('rejects malformed or unbounded event input %#', value => {
    expect(() => validateEntityInvalidation(value)).toThrow(EntityInvalidationInputError);
  });
  it('rejects an unknown source before touching the store', async () => {
    const f = fixture();
    await expect(f.a.invalidate({ ...input, source: 'unknown' })).rejects.toThrow(
      'unknown entity source or type',
    );
    expect(f.a.metrics.invalidations).toBe(0);
  });
});

describe('authenticated bounded invalidation webhook', () => {
  it('handles real Hive Gateway HTTP requests before GraphQL execution', async () => {
    const f = fixture();
    await f.first(request);
    f.set('committed');
    const webhook = createEntityInvalidationWebhook({
      invalidate: f.a.invalidate,
      authenticate: req => req.headers.get('authorization') === 'Bearer test-event-key',
    });
    const runtime = createGatewayRuntime({
      subgraph: schema,
      logging: false,
      plugins: () => [webhook],
    });
    try {
      const call = (authorization?: string) =>
        runtime.fetch(
          new Request('http://gateway/internal/entity-invalidate', {
            method: 'POST',
            headers: authorization
              ? { authorization, 'content-type': 'application/json' }
              : { 'content-type': 'application/json' },
            body: JSON.stringify({ v: 1, ...input }),
          }),
        );
      expect((await call()).status).toBe(401);
      expect(f.a.metrics.invalidations).toBe(0);
      expect((await call('Bearer test-event-key')).status).toBe(204);
      const result: any = await f.peer(request);
      expect(result.data.equipment[0].description).toBe('committed');
      expect(f.executor).toHaveBeenCalledTimes(2);
    } finally {
      await runtime[Symbol.asyncDispose]();
    }
  });

  it('returns an empty failure response through Hive for synchronous and asynchronous authentication errors', async () => {
    for (const authenticate of [
      () => {
        throw new Error('private-auth-canary');
      },
      async () => {
        throw new Error('private-auth-canary');
      },
    ]) {
      const invalidate = jest.fn(async () => {});
      const runtime = createGatewayRuntime({
        subgraph: schema,
        logging: false,
        plugins: () => [createEntityInvalidationWebhook({ invalidate, authenticate })],
      });
      try {
        const response = await runtime.fetch(
          new Request('http://gateway/internal/entity-invalidate', {
            method: 'POST',
            body: 'unparsed',
          }),
        );
        expect(response.status).toBe(503);
        expect(await response.text()).toBe('');
        expect(invalidate).not.toHaveBeenCalled();
      } finally {
        await runtime[Symbol.asyncDispose]();
      }
    }
  });

  const body = { v: 1, ...input };
  async function send(
    payload: unknown,
    {
      authenticated = true,
      authenticationFailure,
      method = 'POST',
      maxBytes = 65536,
      failure,
      headers,
    }: {
      authenticated?: boolean;
      authenticationFailure?: Error;
      method?: string;
      maxBytes?: number;
      failure?: Error;
      headers?: HeadersInit;
    } = {},
  ) {
    const invalidate = jest.fn(async (_value: any) => {
      if (failure) throw failure;
    });
    const plugin = createEntityInvalidationWebhook({
      invalidate,
      authenticate: () => {
        if (authenticationFailure) throw authenticationFailure;
        return authenticated;
      },
      maxBytes,
    });
    let response: Response | undefined;
    await (plugin.onRequest as any)({
      request: new Request('http://gateway/internal/entity-invalidate', {
        method,
        headers,
        body: method === 'GET' ? undefined : JSON.stringify(payload),
      }),
      fetchAPI: { Response },
      endResponse(value: Response) {
        response = value;
      },
    });
    return { response: response!, invalidate };
  }
  it('authenticates before parsing and forwards the versioned event contract', async () => {
    const unauthorized = await send('invalid payload', { authenticated: false });
    expect(unauthorized.response.status).toBe(401);
    expect(unauthorized.invalidate).not.toHaveBeenCalled();
    const valid = await send(body);
    expect(valid.response.status).toBe(204);
    expect(valid.invalidate).toHaveBeenCalledWith(body);
  });
  it('rejects method, protocol, malformed fields and declared body overflow before dispatch', async () => {
    expect((await send(body, { method: 'GET' })).response.status).toBe(405);
    for (const value of [
      { ...body, v: 2 },
      { ...body, event: {} },
      { ...body, identities: ['x'.repeat(257)] },
      { ...body, event: { id: 'bad', version: -1 } },
    ]) {
      const result = await send(value);
      expect(result.response.status).toBe(400);
      expect(result.invalidate).not.toHaveBeenCalled();
    }
    expect((await send(body, { maxBytes: 5 })).response.status).toBe(413);
    expect((await send(body, { headers: { 'content-length': '70000' } })).response.status).toBe(
      413,
    );
  });
  it('bounds chunked bodies without relying on content-length and cancels the reader', async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(8192));
      },
      cancel() {
        cancelled = true;
      },
    });
    const plugin = createEntityInvalidationWebhook({
      invalidate: async () => {},
      authenticate: () => true,
      maxBytes: 4096,
    });
    let response: Response | undefined;
    await (plugin.onRequest as any)({
      request: new Request('http://gateway/internal/entity-invalidate', {
        method: 'POST',
        body: stream,
        duplex: 'half',
      } as any),
      fetchAPI: { Response },
      endResponse(value: Response) {
        response = value;
      },
    });
    expect(response!.status).toBe(413);
    expect(cancelled).toBe(true);
  });
  it('contains authentication exceptions without parsing or forwarding credentials', async () => {
    const result = await send('malformed', {
      authenticationFailure: new Error('private credential failure'),
    });
    expect(result.response.status).toBe(503);
    expect(await result.response.text()).toBe('');
    expect(result.invalidate).not.toHaveBeenCalled();
  });
  it('reports invalid trusted inputs as 400 and retryable storage failures as 503', async () => {
    expect(
      (await send(body, { failure: new EntityInvalidationInputError('unknown entity source') }))
        .response.status,
    ).toBe(400);
    expect((await send(body, { failure: new Error('storage unavailable') })).response.status).toBe(
      503,
    );
  });
  it.each([0, -1, NaN, Infinity, 65537])(
    'rejects an invalid configured body bound %s',
    maxBytes => {
      expect(() =>
        createEntityInvalidationWebhook({
          invalidate: async () => {},
          authenticate: () => true,
          maxBytes,
        }),
      ).toThrow('invalid entity webhook body limit');
    },
  );
});
