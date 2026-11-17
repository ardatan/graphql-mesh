import { createSqlClient, isBunSqlAvailable } from '../src/client.js';

describe('Bun.SQL client', () => {
  const originalBun = (globalThis as { Bun?: unknown }).Bun;

  afterEach(() => {
    if (originalBun === undefined) {
      delete (globalThis as { Bun?: unknown }).Bun;
    } else {
      (globalThis as { Bun?: unknown }).Bun = originalBun;
    }
  });

  it('detects Bun.SQL when present', () => {
    (globalThis as any).Bun = { SQL: class {} };
    expect(isBunSqlAvailable()).toBe(true);
  });

  it('uses Bun.SQL.unsafe for queries when available', async () => {
    const unsafe = jest.fn(async () => {
      const rows: any[] = [{ id: 1 }];
      (rows as any).count = 1;
      return rows;
    });
    const close = jest.fn(async () => undefined);
    (globalThis as any).Bun = {
      SQL: class {
        unsafe = unsafe;
        close = close;
        constructor(
          public url: string,
          public options: Record<string, unknown>,
        ) {}
      },
    };

    const client = createSqlClient({
      adapter: 'postgres',
      location: 'postgres://u@localhost/db',
      max: 5,
      tls: true,
    });
    expect(client.adapter).toBe('postgres');

    const result = await client.query('SELECT 1 AS id WHERE x = $1', [42]);
    expect(unsafe).toHaveBeenCalledWith('SELECT 1 AS id WHERE x = $1', [42]);
    expect(result.rows).toEqual([{ id: 1 }]);
    expect(result.rowCount).toBe(1);

    await client.dispose();
    expect(close).toHaveBeenCalled();
  });

  it('falls back to Node drivers when preferNode is set', () => {
    (globalThis as any).Bun = {
      SQL: class {
        constructor() {
          throw new Error('should not construct Bun.SQL');
        }
      },
    };
    const client = createSqlClient({
      adapter: 'sqlite',
      location: ':memory:',
      preferNode: true,
    });
    expect(client.adapter).toBe('sqlite');
  });
});
