import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
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
      connectionString: dbPath,
      cwd: this.baseDir,
    });

    const executor = getSqlExecutor({
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

  const db = new DatabaseSync(outPath);
  try {
    db.exec(dump.toString('utf8'));
  } finally {
    db.close();
  }
  return outPath;
}
