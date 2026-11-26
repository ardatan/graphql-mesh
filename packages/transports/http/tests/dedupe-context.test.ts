import { buildSchema, parse } from 'graphql';
import httpTransport from '../src/index.js';

describe('http transport dedupe', () => {
  it('enables cross-context dedupe only when fetch arity is context-independent', async () => {
    const schema = buildSchema(`type Query { hello: String }`);
    const calls: Array<{ context: unknown }> = [];

    // length < 3 → independent of context
    const shortFetch = async (url: string, init?: RequestInit) => {
      calls.push({ context: undefined });
      return new Response(JSON.stringify({ data: { hello: 'world' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    expect(shortFetch.length).toBeLessThan(3);

    const executor = await httpTransport.getSubgraphExecutor({
      subgraphName: 'test',
      subgraph: schema,
      transportEntry: {
        kind: 'http',
        subgraph: 'test',
        location: 'http://localhost/graphql',
      },
      fetch: shortFetch as any,
      log: { child: () => ({ debug() {}, error() {} }), debug() {}, error() {} } as any,
      getTransportExecutor: async () => {
        throw new Error('not used');
      },
    });

    const doc = parse(`query { hello }`);
    await Promise.all([
      executor({ document: doc, context: { a: 1 }, operationType: 'query' }),
      executor({ document: doc, context: { b: 2 }, operationType: 'query' }),
    ]);
    // Cross-context dedupe should collapse identical inflight requests to one fetch.
    expect(calls.length).toBe(1);
  });

  it('keeps per-context dedupe when fetch accepts context', async () => {
    const schema = buildSchema(`type Query { hello: String }`);
    const calls: unknown[] = [];

    // length >= 3 → context-aware
    const contextFetch = async (
      _url: string,
      _init?: RequestInit,
      context?: unknown,
      _info?: unknown,
    ) => {
      calls.push(context);
      return new Response(JSON.stringify({ data: { hello: 'world' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    expect(contextFetch.length).toBeGreaterThanOrEqual(3);

    const executor = await httpTransport.getSubgraphExecutor({
      subgraphName: 'test',
      subgraph: schema,
      transportEntry: {
        kind: 'http',
        subgraph: 'test',
        location: 'http://localhost/graphql',
      },
      fetch: contextFetch as any,
      log: { child: () => ({ debug() {}, error() {} }), debug() {}, error() {} } as any,
      getTransportExecutor: async () => {
        throw new Error('not used');
      },
    });

    const doc = parse(`query { hello }`);
    await Promise.all([
      executor({ document: doc, context: { a: 1 }, operationType: 'query' }),
      executor({ document: doc, context: { b: 2 }, operationType: 'query' }),
    ]);
    expect(calls.length).toBe(2);
  });
});
