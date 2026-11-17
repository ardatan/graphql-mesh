import {
  inferDialectFromConnectionString,
  parseSqlUri,
} from '../src/uri.js';

describe('inferDialectFromConnectionString (Bun-compatible)', () => {
  it('detects postgres protocols and host-style URIs', () => {
    expect(inferDialectFromConnectionString('postgres://u:p@localhost:5432/db')).toBe('postgres');
    expect(inferDialectFromConnectionString('postgresql://localhost/db')).toBe('postgres');
    expect(inferDialectFromConnectionString('localhost:5432/mydb')).toBe('postgres');
    expect(inferDialectFromConnectionString('user:pass@localhost:5432/shop')).toBe('postgres');
  });

  it('detects mysql / mysql2 / mariadb / mysqls', () => {
    expect(inferDialectFromConnectionString('mysql://u:p@localhost:3306/db')).toBe('mysql');
    expect(inferDialectFromConnectionString('mysql2://u:p@localhost/db')).toBe('mysql');
    expect(inferDialectFromConnectionString('mariadb://u:p@localhost/db')).toBe('mysql');
    expect(inferDialectFromConnectionString('mysqls://u:p@localhost/db')).toBe('mysql');
  });

  it('detects sqlite / file / :memory: / *.db', () => {
    expect(inferDialectFromConnectionString('sqlite://myapp.db')).toBe('sqlite');
    expect(inferDialectFromConnectionString('sqlite:myapp.db')).toBe('sqlite');
    expect(inferDialectFromConnectionString('file:./data.db')).toBe('sqlite');
    expect(inferDialectFromConnectionString(':memory:')).toBe('sqlite');
    expect(inferDialectFromConnectionString('chinook.db')).toBe('sqlite');
    expect(inferDialectFromConnectionString('./local.sqlite')).toBe('sqlite');
  });

  it('throws on unknown protocols', () => {
    expect(() => inferDialectFromConnectionString('pg://localhost/db')).toThrow(/Unsupported/);
    expect(() => inferDialectFromConnectionString('sqlite3://x.db')).toThrow(/Unsupported/);
  });
});

describe('parseSqlUri', () => {
  it('parses mysql2 and mariadb as mysql dialect', () => {
    expect(parseSqlUri('mysql2://root:secret@db:3307/app').dialect).toBe('mysql');
    expect(parseSqlUri('mysql2://root:secret@db:3307/app').port).toBe(3307);
    expect(parseSqlUri('mariadb://u@localhost/db').database).toBe('db');
  });

  it('parses host-style postgres without protocol', () => {
    const parsed = parseSqlUri('localhost:5432/mydb');
    expect(parsed.dialect).toBe('postgres');
    expect(parsed.host).toBe('localhost');
    expect(parsed.port).toBe(5432);
    expect(parsed.database).toBe('mydb');
  });

  it('parses sqlite file paths', () => {
    expect(parseSqlUri('sqlite://./app.db').filePath).toBe('./app.db');
    expect(parseSqlUri(':memory:').filePath).toBe(':memory:');
    expect(parseSqlUri('chinook.db').filePath).toBe('chinook.db');
  });
});
