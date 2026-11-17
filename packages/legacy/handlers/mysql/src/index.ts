import type { GraphQLSchema } from 'graphql';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import type { MeshHandler, MeshHandlerOptions, MeshSource, YamlConfig } from '@graphql-mesh/types';
import { dispose, isDisposable } from '@graphql-mesh/utils';
import { getSqlExecutor, loadGraphQLSchemaFromSql } from '@omnigraph/sql';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

export default class MySQLHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.MySQLHandler;
  private baseDir: string;
  private schemaProxy: StoreProxy<GraphQLSchema>;
  private disposableResource?: Disposable | AsyncDisposable;

  constructor({ name, config, baseDir, store }: MeshHandlerOptions<YamlConfig.MySQLHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.schemaProxy = store.proxy(
      'schema.graphql',
      PredefinedProxyOptions.GraphQLSchemaWithDiffing,
    );
  }

  async getMeshSource(): Promise<MeshSource> {
    if (this.config.pool != null) {
      throw new Error(
        '@graphql-mesh/mysql: `pool` is no longer supported. The handler now uses `@omnigraph/sql` / `transport-sql` and opens its own connection from host/user/password/database (or set those fields).',
      );
    }
    if (this.config.tableFields?.length) {
      throw new Error(
        '@graphql-mesh/mysql: `tableFields` is no longer supported under `@omnigraph/sql`. Use `tables` to include whole tables, or hand-edit the emitted `@sql__*` SDL.',
      );
    }

    const schema = await this.schemaProxy.getWithSet(() => {
      const endpointUrl = new URL('mysql://localhost:3306');
      if (this.config.port) {
        endpointUrl.port = this.config.port.toString();
      }
      if (this.config.host) {
        endpointUrl.hostname = this.config.host;
      }
      if (this.config.user) {
        endpointUrl.username = this.config.user;
      }
      if (this.config.password) {
        endpointUrl.password = this.config.password;
      }
      if (this.config.database) {
        endpointUrl.pathname = this.config.database;
      }
      if (this.config.ssl) {
        endpointUrl.protocol = 'mysqls:';
      }
      return loadGraphQLSchemaFromSql(this.name, {
        type: 'mysql',
        endpoint: endpointUrl.toString(),
        includeTables: this.config.tables,
        cwd: this.baseDir,
      });
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
