import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { introspectSqlite } from '../src/introspect/sqlite.js';

describe('sqlite INTEGER PRIMARY KEY / WITHOUT ROWID catalog', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sql-rowid-'));
    dbPath = join(dir, 't.sqlite');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function seed(sql: string) {
    const db = new DatabaseSync(dbPath);
    try {
      db.exec(sql);
    } finally {
      db.close();
    }
  }

  it('marks plain INTEGER PRIMARY KEY as autoIncrement (rowid alias)', () => {
    seed(`CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT);`);
    const meta = introspectSqlite({ db: dbPath });
    const id = meta.tables.find(t => t.name === 't')!.columns.find(c => c.name === 'id')!;
    expect(id.primaryKey).toBe(true);
    expect(id.autoIncrement).toBe(true);
    expect(id.notNull).toBe(true);
  });

  it('does not mark INTEGER PRIMARY KEY on WITHOUT ROWID as autoIncrement', () => {
    seed(`CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT) WITHOUT ROWID;`);
    const meta = introspectSqlite({ db: dbPath });
    const id = meta.tables.find(t => t.name === 't')!.columns.find(c => c.name === 'id')!;
    expect(id.primaryKey).toBe(true);
    expect(id.autoIncrement).toBe(false);
  });

  it('does not mark INTEGER PRIMARY KEY DESC as autoIncrement (not a rowid alias)', () => {
    seed(`CREATE TABLE t (id INTEGER PRIMARY KEY DESC, name TEXT);`);
    const meta = introspectSqlite({ db: dbPath });
    const id = meta.tables.find(t => t.name === 't')!.columns.find(c => c.name === 'id')!;
    expect(id.primaryKey).toBe(true);
    expect(id.autoIncrement).toBe(false);
  });
});
