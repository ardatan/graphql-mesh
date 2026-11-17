import type { MeshHandler, MeshHandlerOptions, MeshSource, YamlConfig } from '@graphql-mesh/types';
import { dispose, isDisposable } from '@graphql-mesh/utils';
import { getSqlExecutor, loadGraphQLSchemaFromSql } from '@omnigraph/sql';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

/**
 * Legacy v0 SQLite handler name (`tuql`). Under the hood this now uses
 * `@omnigraph/sql` + `@graphql-mesh/transport-sql` (`@sql__*` directives).
 * The emitted GraphQL shape is the new SQL surface, not classic tuql.
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
    if (this.config.infile != null) {
      throw new Error(
        '@graphql-mesh/tuql: `infile` (SQL dump → in-memory DB) is not supported on the `@omnigraph/sql` path. Point `db` at an SQLite file instead.',
      );
    }
    if (this.config.db == null) {
      throw new Error('@graphql-mesh/tuql: `db` (path to an SQLite file) is required.');
    }

    const schema = await loadGraphQLSchemaFromSql(this.name, {
      type: 'sqlite',
      db: this.config.db,
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
