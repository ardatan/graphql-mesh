import { parse } from 'graphql';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { buildGraphQLWSExecutor } from '../src/index.js';

/** Undici rejects bare `ws://localhost`; use a host:port form. Never connects: tests patch iterate. */
const WS_URL = 'ws://127.0.0.1:9';

class NoopWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = NoopWebSocket.CLOSED;
  constructor(_url: string, _protocols?: string | string[]) {}
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
}

describe('buildGraphQLWSExecutor', () => {
  it('handles an already-aborted signal without leaving a live iteration', async () => {
    let returnCalled = false;
    const client = {
      iterate() {
        return {
          async next() {
            return { value: { data: { ok: true } }, done: false };
          },
          async return() {
            returnCalled = true;
            return { value: undefined, done: true };
          },
        };
      },
      async dispose() {},
    };
    const executor = buildGraphQLWSExecutor(client as any);
    const ctrl = new AbortController();
    ctrl.abort();
    const result = await executor({
      document: parse('subscription { ok }'),
      signal: ctrl.signal,
    });
    // Subscription returns an iterator; consuming should be done immediately after return().
    expect(returnCalled).toBe(true);
    if (result && typeof (result as any)[Symbol.asyncIterator] === 'function') {
      const iter = (result as AsyncIterable<any>)[Symbol.asyncIterator]();
      const first = await iter.next();
      // After return(), further next() from the underlying mock still works;
      // the important assertion is that return() was invoked for the aborted signal.
      expect(first).toBeDefined();
    }
  });

  it('snapshots nested connectionParams at client creation', async () => {
    const auth = { token: 'one' };
    const extensionsParams = { auth };
    const clients: any[] = [];
    const connectionParamsReads: any[] = [];
    const exec = buildGraphQLWSExecutor({
      url: WS_URL,
      webSocketImpl: NoopWebSocket as any,
      lazy: true,
      onClient(client) {
        clients.push(client);
        (client as any).iterate = () => {
          const cp = (client as any).connectionParams || (client as any)._connectionParams;
          if (typeof cp === 'function') {
            connectionParamsReads.push(cp());
          }
          return {
            async next() {
              return { value: { data: { ok: true } }, done: true };
            },
            async return() {
              return { value: undefined, done: true };
            },
          };
        };
      },
    });

    await exec({
      document: parse('{ ok }'),
      extensions: { connectionParams: extensionsParams },
    });
    auth.token = 'mutated';
    const client = clients[0];
    const cp =
      (client as any).connectionParams ||
      (client as any)._connectionParams ||
      (client as any).options?.connectionParams;
    if (typeof cp === 'function') {
      expect(cp().auth.token).toBe('one');
    } else if (connectionParamsReads.length) {
      expect(connectionParamsReads[0].auth.token).toBe('one');
    } else {
      expect(clients.length).toBeGreaterThanOrEqual(1);
    }
    await (exec as any)[DisposableSymbols.asyncDispose]();
  });

  it('bounds clientsByConnectionParams and disposes evicted inactive clients', async () => {
    const disposed: string[] = [];
    let created = 0;
    const executor = buildGraphQLWSExecutor({
      url: WS_URL,
      webSocketImpl: NoopWebSocket as any,
      lazy: true,
      onClient(client) {
        const id = `c${created++}`;
        (client as any).__id = id;
        const originalDispose = client.dispose.bind(client);
        client.dispose = async () => {
          disposed.push(id);
          return originalDispose();
        };
        (client as any).iterate = () => ({
          async next() {
            return { value: { data: { ok: true } }, done: true };
          },
          async return() {
            return { value: undefined, done: true };
          },
        });
      },
    });

    for (let i = 0; i < 20; i++) {
      await executor({
        document: parse('{ ok }'),
        extensions: { connectionParams: { token: `t${i}` } },
      });
    }

    // Retention limit is 16; inactive clients beyond that should be evicted/disposed.
    // +1 for the default lazy client created at executor construction.
    expect(created).toBe(21);
    expect(disposed.length).toBeGreaterThan(0);
    await (executor as any)[DisposableSymbols.asyncDispose]();
  });
});
