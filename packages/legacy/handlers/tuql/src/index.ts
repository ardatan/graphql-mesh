/* eslint-disable import/no-nodejs-modules */
import { createHash, randomBytes } from 'node:crypto';
import { linkSync, mkdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { MeshHandler, MeshHandlerOptions, MeshSource, YamlConfig } from '@graphql-mesh/types';
import { dispose, isDisposable } from '@graphql-mesh/utils';
import { getSqlExecutor, loadGraphQLSchemaFromSql } from '@omnigraph/sql';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

/**
 * Legacy v0 SQLite handler (`tuql`). Under the hood `@omnigraph/sql` + `transport-sql`.
 * `infile` stays a legacy convenience: the dump is materialized to a real `.sqlite` file
 * here so the core SQL loader/transport only ever see a normal connection string / path.
 */
export default class TuqlHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.TuqlHandler;
  private baseDir: string;
  private disposableResource?: Disposable | AsyncDisposable;

  constructor({ name, config, baseDir }: MeshHandlerOptions<YamlConfig.TuqlHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
  }

  async getMeshSource(): Promise<MeshSource> {
    const dbRaw = typeof this.config.db === 'string' ? this.config.db : this.config.db;
    const infileRaw =
      typeof this.config.infile === 'string' ? this.config.infile : this.config.infile;
    // Trim only for blank detection — keep the original nonblank path for materialization.
    const dbBlank = dbRaw == null || (typeof dbRaw === 'string' && dbRaw.trim() === '');
    const infileBlank =
      infileRaw == null || (typeof infileRaw === 'string' && infileRaw.trim() === '');
    if (dbBlank && infileBlank) {
      throw new Error(
        '@graphql-mesh/tuql: provide `db` (SQLite file) or `infile` (SQL dump → sqlite file).',
      );
    }

    const dbPath =
      !infileBlank && typeof infileRaw === 'string'
        ? materializeInfileToSqlite(infileRaw, this.baseDir)
        : (dbRaw as string);

    const schema = await loadGraphQLSchemaFromSql(this.name, {
      adapter: 'sqlite',
      endpoint: dbPath,
      cwd: this.baseDir,
    });

    const executor = await getSqlExecutor({
      subgraph: schema,
      cwd: this.baseDir,
    });

    if (isDisposable(executor)) {
      this.disposableResource = executor;
    }

    return {
      schema,
      executor,
    };
  }

  [DisposableSymbols.asyncDispose]() {
    if (this.disposableResource) {
      return dispose(this.disposableResource);
    }
  }
}

/** Prefer a user-private cache dir over the shared OS temp directory. */
function tuqlCacheDir(baseDir?: string): string {
  const override = process.env.MESH_TUQL_CACHE_DIR?.trim();
  const preferred = override
    ? isAbsolute(override)
      ? override
      : resolve(baseDir || process.cwd(), override)
    : typeof homedir === 'function'
      ? join(homedir(), '.cache', 'graphql-mesh-tuql')
      : join(tmpdir(), 'graphql-mesh-tuql');
  try {
    mkdirSync(preferred, { recursive: true, mode: 0o700 });
    return preferred;
  } catch {
    // Home / override may be read-only — fall back to a private dir under tmp.
    const fallback = join(tmpdir(), 'graphql-mesh-tuql');
    mkdirSync(fallback, { recursive: true, mode: 0o700 });
    return fallback;
  }
}

/**
 * Convert a SQL dump into a durable sqlite file the core loader can open via `db`.
 * Cache key is absolute dump path + dump bytes actually passed to `db.exec`.
 */
function materializeInfileToSqlite(infile: string, cwd: string): string {
  const dumpAbs = isAbsolute(infile) ? infile : join(cwd, infile);
  const dump = readFileSync(dumpAbs);
  const tag = createHash('sha1')
    .update(dumpAbs)
    .update('\0')
    .update(dump)
    .digest('hex')
    .slice(0, 12);
  const outPath = join(tuqlCacheDir(cwd), `mesh-tuql-${tag}.sqlite`);

  try {
    // Reuse if already built for this dump fingerprint
    statSync(outPath);
    return outPath;
  } catch {
    // fall through and create
  }

  // Build into a private temp file, then publish with create-if-absent so a
  // concurrent materializer cannot overwrite a live DB that already received writes.
  const tmpPath = `${outPath}.${randomBytes(8).toString('hex')}.tmp`;
  try {
    const db = new DatabaseSync(tmpPath);
    try {
      db.exec(dump.toString('utf8'));
    } finally {
      db.close();
    }
    try {
      // Hard-link is atomic and fails with EEXIST if another process won the race.
      linkSync(tmpPath, outPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw err;
      }
      // Winner already published — discard our temp copy and use theirs.
    }
  } finally {
    try {
      unlinkSync(tmpPath);
    } catch {
      /* best-effort cleanup */
    }
  }
  return outPath;
}
