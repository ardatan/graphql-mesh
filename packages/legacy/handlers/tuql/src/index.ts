/* eslint-disable import/no-nodejs-modules */
import { createHash, randomBytes } from 'node:crypto';
import { linkSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
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
    if (this.config.db == null && this.config.infile == null) {
      throw new Error(
        '@graphql-mesh/tuql: provide `db` (SQLite file) or `infile` (SQL dump → sqlite file).',
      );
    }

    const dbPath =
      this.config.infile != null
        ? materializeInfileToSqlite(this.config.infile, this.baseDir)
        : this.config.db!;

    const schema = await loadGraphQLSchemaFromSql(this.name, {
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
 * Convert a SQL dump into a durable sqlite file the core loader can open via `db`.
 * Rebuilt when the dump mtime/size changes (hash in filename keeps compose/serve stable).
 */
function materializeInfileToSqlite(infile: string, cwd: string): string {
  const dumpAbs = isAbsolute(infile) ? infile : join(cwd, infile);
  const dump = readFileSync(dumpAbs);
  const st = statSync(dumpAbs);
  const tag = createHash('sha1')
    .update(dumpAbs)
    .update(String(st.mtimeMs))
    .update(String(st.size))
    .digest('hex')
    .slice(0, 12);
  const outPath = join(tmpdir(), `mesh-tuql-${tag}.sqlite`);

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
