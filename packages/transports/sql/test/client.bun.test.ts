/**
 * Native Bun.SQL coverage — run with Bun itself:
 *   bun test packages/transports/sql/test/client.bun.test.ts
 *
 * Excluded from Jest (Node) via jest.config.js.
 */
import { createSqlClient, isBunSqlAvailable } from '../src/client.ts';

describe('createSqlClient under Bun.SQL', () => {
  it('detects Bun.SQL', () => {
    expect(isBunSqlAvailable()).toBe(true);
    expect(typeof Bun.SQL).toBe('function');
  });

  it('queries sqlite via native Bun.SQL', async () => {
    const client = createSqlClient({
      adapter: 'sqlite',
      location: ':memory:',
    });
    expect(client.adapter).toBe('sqlite');

    await client.query('CREATE TABLE artists (id INTEGER PRIMARY KEY, name TEXT)');
    await client.query('INSERT INTO artists (name) VALUES (?), (?)', ['AC/DC', 'Accept']);
    const result = await client.query<{ id: number; name: string }>(
      'SELECT id, name FROM artists WHERE id = ?',
      [1],
    );
    expect(result.rows).toEqual([{ id: 1, name: 'AC/DC' }]);
    expect(result.rowCount).toBe(1);

    await client.dispose();
  });

  it('honours preferNode and uses node:sqlite instead of Bun.SQL', async () => {
    const client = createSqlClient({
      adapter: 'sqlite',
      location: ':memory:',
      preferNode: true,
    });
    await client.query('CREATE TABLE t (id INTEGER PRIMARY KEY)');
    await client.query('INSERT INTO t DEFAULT VALUES');
    const result = await client.query('SELECT id FROM t');
    expect(result.rows).toEqual([{ id: 1 }]);
    await client.dispose();
  });
});
