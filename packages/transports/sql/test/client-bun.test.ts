import {
  buildBunSqlCtorOptions,
  isBunSqlAvailable,
  resolveBunTlsOption,
  resolveSslOption,
} from '../src/client.js';
import { parseSqlUri } from '../src/uri.js';

describe('Bun.SQL availability (Node / Jest)', () => {
  it('is unavailable under plain Node (native coverage lives in client.bun.test.ts)', () => {
    // Jest runs on Node; Bun.SQL only exists when the process is Bun.
    expect(isBunSqlAvailable()).toBe(false);
  });

  it('forwards ssl.ca / rejectUnauthorized into Bun tls options', () => {
    expect(resolveBunTlsOption(true, { ca: 'PEM', rejectUnauthorized: true })).toEqual({
      rejectUnauthorized: true,
      ca: 'PEM',
    });
    expect(resolveBunTlsOption('insecure', { ca: 'PEM' })).toEqual({
      rejectUnauthorized: false,
      ca: 'PEM',
    });
    expect(resolveBunTlsOption(false)).toBe(false);
    expect(resolveBunTlsOption('disable')).toBe(false);
    expect(resolveBunTlsOption(undefined)).toBeUndefined();
    expect(
      buildBunSqlCtorOptions({
        adapter: 'mysql',
        location: 'mysqls://u@h/db',
        tls: true,
        ssl: { ca: 'someCA', rejectUnauthorized: true },
      }).tls,
    ).toEqual({ rejectUnauthorized: true, ca: 'someCA' });
    expect(
      buildBunSqlCtorOptions({
        adapter: 'mysql',
        location: 'mysqls://u@h/db',
        tls: false,
      }).tls,
    ).toBe(false);
  });

  it('sets Postgres search_path on every Bun pooled connection via connection GUC', () => {
    expect(
      buildBunSqlCtorOptions({
        adapter: 'postgres',
        location: 'postgres://u@h/db',
        schema: 'app',
      }).connection,
    ).toEqual({ search_path: '"app"' });
    expect(
      buildBunSqlCtorOptions({
        adapter: 'postgres',
        location: 'postgres://u@h/db',
        schema: 'public',
      }).connection,
    ).toEqual({ search_path: '"public"' });
  });

  it('resolveSslOption treats sslmode=no-verify as insecure (shared with introspect)', () => {
    const parsed = parseSqlUri('mysql://h/db?sslmode=no-verify');
    expect(resolveSslOption(undefined, parsed, undefined)).toEqual({
      rejectUnauthorized: false,
    });
    expect(resolveSslOption('disable', parsed, { ca: 'PEM' })).toBeUndefined();
    expect(resolveSslOption(true, parseSqlUri('mysql://h/db'), { ca: 'PEM' })).toEqual({
      rejectUnauthorized: true,
      ca: 'PEM',
    });
  });
});

describe('applyPgPoolSearchPath / wrapPgPoolAsSqlClient', () => {
  it('registers acquire/connect listeners including explicit public schema', async () => {
    const { applyPgPoolSearchPath, wrapPgPoolAsSqlClient } = await import('../src/client.js');
    const byEvent: Record<string, Array<(client: any) => void>> = { connect: [], acquire: [] };
    const pool = {
      query: async () => ({ rows: [] }),
      on: (event: string, listener: (client: any) => void) => {
        (byEvent[event] ||= []).push(listener);
      },
    };
    wrapPgPoolAsSqlClient(pool, { schema: 'app' });
    expect(byEvent.acquire.length).toBe(1);
    expect(byEvent.connect.length).toBe(1);
    const queries: string[] = [];
    const client = {
      query: async (sql: string) => {
        queries.push(sql);
      },
    };
    byEvent.acquire[0](client);
    await Promise.resolve(); // seen only after SET resolves
    byEvent.acquire[0](client); // once per client
    expect(queries).toEqual(['SET search_path TO "app"']);

    // Concurrent caller query waits for in-flight SET (no double-query race).
    let releaseSet!: () => void;
    const setGate = new Promise<void>(resolve => {
      releaseSet = resolve;
    });
    const ordered: string[] = [];
    const slowClient = {
      query: async (q: string) => {
        if (q.startsWith('SET ')) {
          ordered.push('set-start');
          await setGate;
          ordered.push('set-done');
          return;
        }
        ordered.push(`query:${q}`);
      },
    };
    byEvent.connect[0](slowClient);
    const caller = slowClient.query('SELECT 1');
    releaseSet();
    await caller;
    expect(ordered).toEqual(['set-start', 'set-done', 'query:SELECT 1']);

    const byEvent2: Record<string, Array<(client: any) => void>> = { connect: [], acquire: [] };
    applyPgPoolSearchPath(
      {
        on: (event: string, listener: (client: any) => void) => {
          (byEvent2[event] ||= []).push(listener);
        },
      },
      'public',
    );
    expect(byEvent2.acquire.length).toBe(1);
    const queries2: string[] = [];
    byEvent2.acquire[0]({
      query: async (sql: string) => {
        queries2.push(sql);
      },
    });
    await Promise.resolve();
    expect(queries2[0]).toMatch(/SET search_path TO "public"/);
  });
});
