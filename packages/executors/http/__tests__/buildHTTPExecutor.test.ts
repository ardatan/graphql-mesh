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
});
