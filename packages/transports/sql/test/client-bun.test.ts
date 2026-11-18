import {
  buildBunSqlCtorOptions,
  isBunSqlAvailable,
  pgPoolConfigFromLocation,
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

  it('pgPoolConfigFromLocation uses discrete fields so URI sslmode cannot override ssl.ca', () => {
    const ssl = { rejectUnauthorized: true, ca: 'PEM' };
    const cfg = pgPoolConfigFromLocation(
      'postgres://app:s3cret@db.internal:6543/shop?sslmode=require',
      { ssl },
    );
    expect(cfg).toMatchObject({
      host: 'db.internal',
      port: 6543,
      user: 'app',
      password: 's3cret',
      database: 'shop',
      ssl,
    });
    expect(cfg).not.toHaveProperty('connectionString');
  });

  it('pgPoolConfigFromLocation honors ?host= socket and omits forced localhost defaults', () => {
    const cfg = pgPoolConfigFromLocation(
      'postgres:///shop?host=/var/run/postgresql&application_name=mesh',
    );
    expect(cfg).toMatchObject({
      host: '/var/run/postgresql',
      database: 'shop',
      application_name: 'mesh',
    });
    expect(cfg.port).toBeUndefined();
  });

  it('pgPoolConfigFromLocation rejects unsupported URI query params', () => {
    expect(() => pgPoolConfigFromLocation('postgres://localhost/shop?keepalives=1')).toThrow(
      /Unsupported postgres URI query parameter "keepalives"/,
    );
  });

  it('mysql wrapper coerces BIT(1) Buffer to boolean; wider BIT stays binary', async () => {
    const { wrapMysqlPoolAsSqlClient } = await import('../src/client.js');
    const client = wrapMysqlPoolAsSqlClient({
      // promise-pool shape (has execute)
      execute: async () => [{}, []],
      query: async () => [
        [{ flag: Buffer.from([1]), off: Buffer.from([0]), wide: Buffer.from([0xff]) }],
        [
          { name: 'flag', type: 16, length: 1 },
          { name: 'off', type: 16, length: 1 },
          { name: 'wide', type: 16, length: 8 },
        ],
      ],
    });
    const { rows } = await client.query('select 1');
    expect(rows[0]).toEqual({
      flag: true,
      off: false,
      wide: Buffer.from([0xff]),
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

  it('rejects conflicting schema bindings on the same shared pool', async () => {
    const { applyPgPoolSearchPath } = await import('../src/client.js');
    const pool = {
      on: () => undefined,
    };
    applyPgPoolSearchPath(pool, 'app');
    expect(() => applyPgPoolSearchPath(pool, 'other')).toThrow(/conflicting schema/);
    // Same schema is a no-op (no stacked listeners).
    expect(() => applyPgPoolSearchPath(pool, 'app')).not.toThrow();
  });

  it('rejects callers when search_path SET fails and retries on next acquire', async () => {
    const { applyPgPoolSearchPath } = await import('../src/client.js');
    const byEvent: Record<string, Array<(client: any) => void>> = { connect: [], acquire: [] };
    applyPgPoolSearchPath(
      {
        on: (event: string, listener: (client: any) => void) => {
          (byEvent[event] ||= []).push(listener);
        },
      },
      'app',
    );

    let setShouldFail = true;
    const queries: string[] = [];
    const client = {
      query: async (q: string) => {
        queries.push(q);
        if (q.startsWith('SET ') && setShouldFail) {
          throw new Error('SET search_path failed');
        }
        return { rows: [] };
      },
    };

    byEvent.acquire[0](client);
    await expect(client.query('SELECT 1')).rejects.toThrow(/SET search_path failed/);
    // Fail-closed: further queries reject without running user SQL.
    await expect(client.query('SELECT 2')).rejects.toThrow(/SET search_path failed/);
    expect(queries.filter(q => q.startsWith('SELECT'))).toEqual([]);

    setShouldFail = false;
    byEvent.acquire[0](client); // retry SET on next acquire
    await expect(client.query('SELECT 3')).resolves.toEqual({ rows: [] });
    expect(queries.filter(q => q === 'SELECT 3')).toEqual(['SELECT 3']);
  });

  it('handles SET failure before any query without unhandled rejection', async () => {
    const { applyPgPoolSearchPath } = await import('../src/client.js');
    const byEvent: Record<string, Array<(client: any) => void>> = { connect: [], acquire: [] };
    applyPgPoolSearchPath(
      {
        on: (event: string, listener: (client: any) => void) => {
          (byEvent[event] ||= []).push(listener);
        },
      },
      'app',
    );

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);

    let releaseCount = 0;
    const client = {
      query: async (q: string) => {
        if (q.startsWith('SET ')) {
          throw new Error('SET search_path failed before query');
        }
        return { rows: [] };
      },
      release: () => {
        releaseCount += 1;
      },
    };

    try {
      byEvent.acquire[0](client);
      // Let SET settle with no caller query attached yet.
      await new Promise<void>(resolve => setImmediate(resolve));
      await new Promise<void>(resolve => setImmediate(resolve));
      expect(unhandled).toEqual([]);
      // Must not release here — pool.query / caller releases once on error.
      expect(releaseCount).toBe(0);
      await expect(client.query('SELECT 1')).rejects.toThrow(/SET search_path failed before query/);
      expect(releaseCount).toBe(0);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('pool.query-style path releases once when SET fails under a waiting query', async () => {
    const { applyPgPoolSearchPath } = await import('../src/client.js');
    const byEvent: Record<string, Array<(client: any) => void>> = { connect: [], acquire: [] };
    applyPgPoolSearchPath(
      {
        on: (event: string, listener: (client: any) => void) => {
          (byEvent[event] ||= []).push(listener);
        },
      },
      'app',
    );

    let releaseCount = 0;
    let selectRan = false;
    let setGate!: () => void;
    const setWait = new Promise<void>(resolve => {
      setGate = resolve;
    });
    const client = {
      query: async (q: string, cb?: (err: Error | null, res?: any) => void) => {
        if (q.startsWith('SET ')) {
          await setWait;
          const err = new Error('SET search_path failed under pool.query');
          if (cb) {
            cb(err);
            return;
          }
          throw err;
        }
        selectRan = true;
        if (cb) {
          cb(null, { rows: [] });
          return;
        }
        return { rows: [] };
      },
      release: () => {
        releaseCount += 1;
        if (releaseCount > 1) {
          throw new Error('Release called on client which has already been released to the pool.');
        }
      },
    };

    byEvent.acquire[0](client);
    // Callback overload (pg-pool pool.query style): SET error reaches the callback;
    // SELECT must not run; checkout released exactly once.
    const poolQuery = new Promise<void>((resolve, reject) => {
      client.query('SELECT 1', (err: Error | null) => {
        try {
          client.release();
        } catch (releaseErr) {
          reject(releaseErr);
          return;
        }
        if (err) resolve();
        else reject(new Error('expected SET failure via callback'));
      });
    });
    setGate();
    await expect(poolQuery).resolves.toBeUndefined();
    expect(selectRan).toBe(false);
    expect(releaseCount).toBe(1);
  });
});
