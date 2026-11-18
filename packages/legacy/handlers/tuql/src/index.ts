/* eslint-disable import/no-nodejs-modules */
import { createHash, randomBytes } from 'node:crypto';
import {
  closeSync,
  fchmodSync,
  constants as fsConstants,
  fstatSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
} from 'node:fs';
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

/**
 * Prefer a user-private cache dir. Before reuse, reject symlinks, foreign
 * ownership, and group/world-writable modes. Fallback is per-uid under tmp;
 * never a shared `/tmp/graphql-mesh-tuql` that another user could pre-create.
 */
function tuqlCacheDir(baseDir?: string): string {
  const override = process.env.MESH_TUQL_CACHE_DIR?.trim();
  const preferred = override
    ? isAbsolute(override)
      ? override
      : resolve(baseDir || process.cwd(), override)
    : typeof homedir === 'function'
      ? join(homedir(), '.cache', 'graphql-mesh-tuql')
      : perUserTmpTuqlCacheDir();
  try {
    return ensurePrivateTuqlCacheDir(preferred);
  } catch (err) {
    if (override) throw err;
    // Home may be read-only / hostile — fall back to a per-user tmp dir.
    return ensurePrivateTuqlCacheDir(perUserTmpTuqlCacheDir());
  }
}

function perUserTmpTuqlCacheDir(): string {
  const uid = typeof process.getuid === 'function' ? String(process.getuid()) : 'nouser';
  return join(tmpdir(), `graphql-mesh-tuql-${uid}`);
}

/**
 * Create (if needed) and harden a tuql cache directory.
 * Validates via `lstat` / `O_NOFOLLOW` open before any mode change so a symlink
 * cannot have its target permissions rewritten, then `fchmod`s the opened inode.
 */
export function ensurePrivateTuqlCacheDir(dir: string): string {
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  } catch (err: any) {
    // Existing non-directory (file) at path: fall through to lstat rejection.
    if (err?.code !== 'EEXIST') throw err;
  }

  // Reject symlinks before any permission change (path-based chmod follows links).
  const pre = lstatSync(dir);
  if (pre.isSymbolicLink()) {
    throw new Error(`@graphql-mesh/tuql: cache dir must not be a symlink (${dir})`);
  }
  if (!pre.isDirectory()) {
    throw new Error(`@graphql-mesh/tuql: cache path is not a directory (${dir})`);
  }
  if (typeof process.getuid === 'function' && pre.uid !== process.getuid()) {
    throw new Error(`@graphql-mesh/tuql: cache dir not owned by current user (${dir})`);
  }

  // Descriptor-based ops: O_NOFOLLOW avoids a path-swap race after lstat.
  const flags =
    fsConstants.O_RDONLY | (fsConstants.O_DIRECTORY ?? 0) | (fsConstants.O_NOFOLLOW ?? 0);
  let fd: number;
  try {
    fd = openSync(dir, flags);
  } catch (err: any) {
    if (err?.code === 'ELOOP' || err?.code === 'EMLINK') {
      throw new Error(`@graphql-mesh/tuql: cache dir must not be a symlink (${dir})`);
    }
    throw err;
  }
  try {
    const st = fstatSync(fd);
    if (typeof process.getuid === 'function' && st.uid !== process.getuid()) {
      throw new Error(`@graphql-mesh/tuql: cache dir not owned by current user (${dir})`);
    }
    try {
      fchmodSync(fd, 0o700);
    } catch {
      // ignore; reject below if still group/world-writable
    }
    const after = fstatSync(fd);
    if ((after.mode & 0o022) !== 0) {
      throw new Error(`@graphql-mesh/tuql: cache dir has unsafe group/world write bits (${dir})`);
    }
  } finally {
    closeSync(fd);
  }
  return dir;
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
