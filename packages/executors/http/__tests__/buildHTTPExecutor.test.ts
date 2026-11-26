import { parse } from 'graphql';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { buildHTTPExecutor } from '../src/index.js';

const queryDoc = parse('{ hello }');
const mutationDoc = parse('mutation { doWrite }');

describe('buildHTTPExecutor', () => {
  it('does not enable APQ when apq is false', async () => {
    const fetches: Array<{ body: string }> = [];
    const executor = buildHTTPExecutor({
      apq: false,
      endpoint: 'http://localhost/graphql',
      fetch: async (_url, init) => {
        fetches.push({ body: String(init?.body) });
        return new Response(JSON.stringify({ data: { hello: 'world' } }), {
          headers: { 'content-type': 'application/json' },
        });
      },
    });
    await executor({ document: queryDoc });
    expect(fetches).toHaveLength(1);
    expect(JSON.parse(fetches[0].body).query).toContain('hello');
    expect(JSON.parse(fetches[0].body).extensions?.persistedQuery).toBeUndefined();
  });

  it('keeps extension headers available for APQ fallback', async () => {
    const authHeaders: string[] = [];
    let call = 0;
    const executor = buildHTTPExecutor({
      apq: true,
      endpoint: 'http://localhost/graphql',
      fetch: async (_url, init) => {
        authHeaders.push(new Headers(init?.headers).get('authorization') || '');
        call++;
        if (call === 1) {
          return new Response(
            JSON.stringify({
              errors: [
                {
                  message: 'PersistedQueryNotFound',
                  extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' },
                },
              ],
            }),
            { headers: { 'content-type': 'application/json' } },
          );
        }
        return new Response(JSON.stringify({ data: { hello: 'world' } }), {
          headers: { 'content-type': 'application/json' },
        });
      },
    });
    await executor({
      document: queryDoc,
      extensions: { headers: { authorization: 'Bearer secret' } },
    });
    expect(authHeaders).toEqual(['Bearer secret', 'Bearer secret']);
  });

  it('sends the initial request when retry is 0', async () => {
    let calls = 0;
    const executor = buildHTTPExecutor({
      retry: 0,
      endpoint: 'http://localhost/graphql',
      fetch: async () => {
        calls++;
        return new Response(JSON.stringify({ data: { hello: 'world' } }), {
          headers: { 'content-type': 'application/json' },
        });
      },
    });
    const result: any = await executor({ document: queryDoc });
    expect(calls).toBe(1);
    expect(result).toEqual({ data: { hello: 'world' } });
  });

  it('does not retry mutations after errors', async () => {
    let calls = 0;
    const executor = buildHTTPExecutor({
      retry: 3,
      endpoint: 'http://localhost/graphql',
      fetch: async () => {
        calls++;
        return new Response(JSON.stringify({ errors: [{ message: 'fail' }] }), {
          headers: { 'content-type': 'application/json' },
        });
      },
    });
    await executor({ document: mutationDoc });
    expect(calls).toBe(1);
  });

  it('does not share inflight responses across different fetch overrides', async () => {
    const fetches: string[] = [];
    const executor = buildHTTPExecutor({
      endpoint: 'http://localhost/graphql',
      fetch: async () => {
        fetches.push('default');
        await new Promise(r => setTimeout(r, 20));
        return new Response(JSON.stringify({ data: { hello: 'default' } }), {
          headers: { 'content-type': 'application/json' },
        });
      },
    });
    const customFetch = async () => {
      fetches.push('custom');
      await new Promise(r => setTimeout(r, 20));
      return new Response(JSON.stringify({ data: { hello: 'custom' } }), {
        headers: { 'content-type': 'application/json' },
      });
    };
    const [a, b] = await Promise.all([
      executor({ document: queryDoc, context: {} }),
      executor({
        document: queryDoc,
        context: {},
        extensions: { fetch: customFetch },
      }),
    ]);
    expect(fetches.sort()).toEqual(['custom', 'default']);
    expect(a).toEqual({ data: { hello: 'default' } });
    expect(b).toEqual({ data: { hello: 'custom' } });
  });

  it('keeps disposal visible across retry attempts', async () => {
    let calls = 0;
    const executor = buildHTTPExecutor({
      retry: 3,
      endpoint: 'http://localhost/graphql',
      fetch: async (_url, init) => {
        calls++;
        if (calls === 1) {
          (executor as any)[DisposableSymbols.dispose]();
          const signal = init?.signal;
          return new Promise((_resolve, reject) => {
            if (signal?.aborted) {
              reject(new DOMException('Aborted', 'AbortError'));
              return;
            }
            signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          });
        }
        return new Response(JSON.stringify({ data: { hello: 'should-not' } }), {
          headers: { 'content-type': 'application/json' },
        });
      },
    });
    const result: any = await executor({ document: queryDoc });
    expect(calls).toBe(1);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('gates request url/body in extensions behind exposeHTTPDetailsInExtensions', async () => {
    const executor = buildHTTPExecutor({
      endpoint: 'http://localhost/graphql',
      exposeHTTPDetailsInExtensions: false,
      fetch: async () =>
        new Response(JSON.stringify({ errors: [{ message: 'nope' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    });
    const result: any = await executor({ document: queryDoc });
    const extensions = result.errors?.[0]?.extensions as any;
    // Method may still be present on the internal object, but url/body must not be assigned when disabled.
    // When expose is false, extensions are not merged onto the result at all.
    expect(result.extensions).toBeUndefined();
    expect(extensions?.request?.url).toBeUndefined();
    expect(extensions?.request?.body).toBeUndefined();
  });

  it('normalizes nullish fetch rejection reasons', async () => {
    const executor = buildHTTPExecutor({
      endpoint: 'http://localhost/graphql',
      fetch: async () => Promise.reject(null),
    });
    const result: any = await executor({ document: queryDoc });
    expect(result.errors?.[0]?.message).toBeTruthy();
  });

  it('gives every consumer of a shared inflight request its own data', async () => {
    let finish!: (response: Response) => void;
    const response = new Promise<Response>(resolve => {
      finish = resolve;
    });
    const fetch = jest.fn(() => response);
    await using executor = buildHTTPExecutor({
      endpoint: 'http://shared-copy-test/graphql',
      fetch,
    });
    const document = parse('{ node { value list } }');
    const pending = [executor({ document }), executor({ document }), executor({ document })];
    finish(
      new Response(JSON.stringify({ data: { node: { value: 'original', list: [1] } } }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    const results = await Promise.all(pending);
    for (const result of results) {
      expect(result).toEqual({
        data: { node: { value: 'original', list: [1] } },
      });
    }
    const datas = results.map((result: any) => result.data);
    expect(new Set(datas).size).toBe(3);
    datas[2].node.value = 'changed';
    datas[2].node.list.push(2);
    for (const data of datas.slice(0, 2)) {
      expect(data).toEqual({ node: { value: 'original', list: [1] } });
    }
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps an own __proto__ key of the response as data in the copies', async () => {
    let finish!: (response: Response) => void;
    const response = new Promise<Response>(resolve => {
      finish = resolve;
    });
    await using executor = buildHTTPExecutor({
      endpoint: 'http://shared-proto-test/graphql',
      fetch: () => response,
    });
    const document = parse('{ node { value } }');
    const pending = [executor({ document }), executor({ document })];
    finish(
      new Response('{"data":{"node":{"__proto__":{"polluted":true},"value":"original"}}}', {
        headers: { 'content-type': 'application/json' },
      }),
    );
    for (const result of await Promise.all(pending)) {
      const node = (result as any).data.node;
      expect(Object.getPrototypeOf(node)).toBe(Object.prototype);
      expect(Object.hasOwn(node, '__proto__')).toBe(true);
      expect(node.polluted).toBeUndefined();
    }
  });
});
