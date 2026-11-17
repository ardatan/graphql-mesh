import type { MeshHandler, MeshHandlerOptions, MeshSource, YamlConfig } from '@graphql-mesh/types';
import { dispose, isDisposable } from '@graphql-mesh/utils';
import { getSqlExecutor, loadGraphQLSchemaFromSql } from '@omnigraph/sql';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

/**
 * Legacy v0 SQLite handler name (`tuql`). Under the hood this now uses
 * `@omnigraph/sql` + `@graphql-mesh/transport-sql` (`@sql__` / `@sql__relation`).
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
        '@graphql-mesh/tuql: provide `db` (SQLite file) or `infile` (SQL dump → in-memory).',
      );
    }

    const schema = await loadGraphQLSchemaFromSql(this.name, {
      type: 'sqlite',
      db: this.config.db,
      infile: this.config.infile,
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
