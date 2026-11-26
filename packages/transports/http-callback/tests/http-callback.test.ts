import { parse } from 'graphql';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import httpCallbackTransport from '../src/index.js';

describe('http-callback transport', () => {
  it('validates fetch/location before starting the heartbeat timeout', () => {
    const pubsub = {
      subscribe: async () => () => {},
    };
    const executor = httpCallbackTransport.getSubgraphExecutor({
      subgraphName: 'test',
      subgraph: {} as any,
      getTransportExecutor: async () => {
        throw new Error('not used');
      },
      transportEntry: {
        kind: 'http-callback',
        subgraph: 'test',
        // location missing
      },
      // fetch missing
      pubsub: pubsub as any,
      log: { child: () => ({ debug() {}, error() {} }) } as any,
    });

    expect(() =>
      executor({
        document: parse(`subscription { tick }`),
        operationType: 'subscription',
      }),
    ).toThrow(/fetch|location/i);
  });

  it('pushes the complete execution result envelope on initiation response data', async () => {
    const pushed: unknown[] = [];
    let resolveSub: (v: unknown) => void;
    const subPromise = new Promise(resolve => {
      resolveSub = resolve;
    });
    const pubsub = {
      subscribe: async (_topic: string, _handler: (msg: any) => void) => {
        return () => {};
      },
    };
    const fetchImpl = async () =>
      new Response(JSON.stringify({ data: { tick: 1 }, extensions: { from: 'init' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const executor = httpCallbackTransport.getSubgraphExecutor({
      subgraphName: 'test',
      subgraph: {} as any,
      getTransportExecutor: async () => {
        throw new Error('not used');
      },
      transportEntry: {
        kind: 'http-callback',
        subgraph: 'test',
        location: 'http://subgraph/graphql',
        options: { heartbeat_interval: 60_000 },
      },
      fetch: fetchImpl as any,
      pubsub: pubsub as any,
      log: {
        child: () => ({
          debug() {},
          error() {},
        }),
      } as any,
    });

    const iterable = executor({
      document: parse(`subscription { tick }`),
      operationType: 'subscription',
      context: {
        waitUntil() {},
      },
    }) as AsyncIterable<unknown>;

    const iterator = iterable[Symbol.asyncIterator]();
    // Allow initiation fetch to complete and push
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const first = await Promise.race([
        iterator.next(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('timeout')), 2000);
        }),
      ]);
      expect(first).toMatchObject({
        value: { data: { tick: 1 }, extensions: { from: 'init' } },
        done: false,
      });
      pushed.push((first as IteratorResult<unknown>).value);
      await iterator.return?.();
      expect(pushed[0]).toEqual({ data: { tick: 1 }, extensions: { from: 'init' } });
    } finally {
      if (timeoutId != null) {
        clearTimeout(timeoutId);
      }
      (
        executor as unknown as {
          [key: symbol]: (() => void) | undefined;
        }
      )[DisposableSymbols.dispose]?.();
    }
    void resolveSub;
    void subPromise;
  });
});
