import { resolveSqlitePath } from '../src/adapter.js';
import {
  inferAdapterFromConnectionString,
  parseSqlUri,
  resolveConnectionStringFromEnv,
} from '../src/uri.js';

describe('inferAdapterFromConnectionString (Bun-compatible)', () => {
  it('detects postgres protocols and host-style URIs', () => {
    expect(inferAdapterFromConnectionString('postgres://u:p@localhost:5432/db')).toBe('postgres');
    expect(inferAdapterFromConnectionString('postgresql://localhost/db')).toBe('postgres');
    expect(inferAdapterFromConnectionString('localhost:5432/mydb')).toBe('postgres');
    expect(inferAdapterFromConnectionString('user:pass@localhost:5432/shop')).toBe('postgres');
  });

  it('detects mysql / mysql2 / mariadb / mysqls', () => {
    expect(inferAdapterFromConnectionString('mysql://u:p@localhost:3306/db')).toBe('mysql');
    expect(inferAdapterFromConnectionString('mysql2://u:p@localhost/db')).toBe('mysql');
    expect(inferAdapterFromConnectionString('mariadb://u:p@localhost/db')).toBe('mysql');
    expect(inferAdapterFromConnectionString('mysqls://u:p@localhost/db')).toBe('mysql');
  });

  it('detects sqlite / file / :memory: / *.db', () => {
    expect(inferAdapterFromConnectionString('sqlite://myapp.db')).toBe('sqlite');
    expect(inferAdapterFromConnectionString('sqlite:myapp.db')).toBe('sqlite');
    expect(inferAdapterFromConnectionString('file:./data.db')).toBe('sqlite');
    expect(inferAdapterFromConnectionString(':memory:')).toBe('sqlite');
    expect(inferAdapterFromConnectionString('chinook.db')).toBe('sqlite');
    expect(inferAdapterFromConnectionString('./local.sqlite')).toBe('sqlite');
  });

  it('throws on unknown protocols', () => {
    expect(() => inferAdapterFromConnectionString('pg://localhost/db')).toThrow(/Unsupported/);
    expect(() => inferAdapterFromConnectionString('sqlite3://x.db')).toThrow(/Unsupported/);
  });
});

describe('parseSqlUri', () => {
  it('parses mysql2 and mariadb as mysql adapter', () => {
    expect(parseSqlUri('mysql2://root:secret@db:3307/app').adapter).toBe('mysql');
    expect(parseSqlUri('mysql2://root:secret@db:3307/app').port).toBe(3307);
    expect(parseSqlUri('mariadb://u@localhost/db').database).toBe('db');
  });

  it('parses host-style postgres without protocol', () => {
    const parsed = parseSqlUri('localhost:5432/mydb');
    expect(parsed.adapter).toBe('postgres');
    expect(parsed.host).toBe('localhost');
    expect(parsed.port).toBe(5432);
    expect(parsed.database).toBe('mydb');
  });

  it('parses sqlite file paths', () => {
    expect(parseSqlUri('sqlite://./app.db').filePath).toBe('./app.db');
    expect(parseSqlUri(':memory:').filePath).toBe(':memory:');
    expect(parseSqlUri('chinook.db').filePath).toBe('chinook.db');
  });

  it('decodes percent-encoded credentials and database names', () => {
    const parsed = parseSqlUri('mysql://u%40x:p%40ss@host/my%20db');
    expect(parsed.user).toBe('u@x');
    expect(parsed.password).toBe('p@ss');
    expect(parsed.database).toBe('my db');
  });

  it('does not enable ssl for mysql sslmode=disable', () => {
    expect(parseSqlUri('mysql://u@h/db?sslmode=disable').ssl).toBeFalsy();
    expect(parseSqlUri('mysql://u@h/db?sslmode=require').ssl).toBe(true);
  });
});

describe('resolveSqlitePath', () => {
  it('keeps sqlite:// relative paths relative', () => {
    expect(resolveSqlitePath('sqlite://data/app.db', '/cwd')).toBe('/cwd/data/app.db');
    expect(resolveSqlitePath('sqlite:///abs/app.db')).toBe('/abs/app.db');
    expect(resolveSqlitePath('sqlite://:memory:')).toBe(':memory:');
  });
});

describe('resolveConnectionStringFromEnv (Bun-compatible)', () => {
  it('prefers DATABASE_URL', () => {
    expect(
      resolveConnectionStringFromEnv({
        DATABASE_URL: 'postgres://u@localhost/db',
        MYSQL_URL: 'mysql://u@localhost/db',
      }),
    ).toBe('postgres://u@localhost/db');
  });

  it('falls through URL env vars in Bun order', () => {
    expect(
      resolveConnectionStringFromEnv({
        MYSQL_URL: 'mysql://root@localhost/app',
      }),
    ).toBe('mysql://root@localhost/app');
    expect(resolveConnectionStringFromEnv({ SQLITE_URL: 'file:./x.db' })).toBe('file:./x.db');
  });

  it('adds sslmode=require for TLS_* URLs', () => {
    expect(
      resolveConnectionStringFromEnv({
        TLS_DATABASE_URL: 'postgres://u@localhost/db',
      }),
    ).toBe('postgres://u@localhost/db?sslmode=require');
  });

  it('composes postgres URL from PG* fields', () => {
    expect(
      resolveConnectionStringFromEnv({
        PGHOST: 'db.internal',
        PGPORT: '6543',
        PGUSER: 'app',
        PGPASSWORD: 's3cret',
        PGDATABASE: 'shop',
        PGSSLMODE: 'require',
      }),
    ).toBe('postgres://app:s3cret@db.internal:6543/shop?sslmode=require');
  });

  it('composes mysql URL when adapter is mysql', () => {
    expect(
      resolveConnectionStringFromEnv(
        {
          MYSQL_HOST: 'mysql',
          MYSQL_USER: 'root',
          MYSQL_DATABASE: 'employees',
        },
        { adapter: 'mysql' },
      ),
    ).toBe('mysql://root@mysql/employees');
  });

  it('skips DATABASE_URL whose protocol disagrees with adapter', () => {
    expect(
      resolveConnectionStringFromEnv(
        {
          DATABASE_URL: 'sqlite://./x.db',
          POSTGRES_URL: 'postgres://u@localhost/db',
        },
        { adapter: 'postgres' },
      ),
    ).toBe('postgres://u@localhost/db');
  });
});
