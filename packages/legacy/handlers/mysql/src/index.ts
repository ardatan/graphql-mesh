/* eslint-disable import/no-nodejs-modules */
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve as resolvePath } from 'node:path';
import type { GraphQLSchema } from 'graphql';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import type {
  ImportFn,
  MeshHandler,
  MeshHandlerOptions,
  MeshSource,
  YamlConfig,
} from '@graphql-mesh/types';
import { dispose, isDisposable, loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { getSqlExecutor, loadGraphQLSchemaFromSql, wrapMysqlPoolAsSqlClient } from '@omnigraph/sql';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

/** Legacy docs treat `ssl.ca` as a filesystem path; mysql2 wants PEM contents. */
function resolveMysqlSslCa(ca: string | undefined, baseDir: string): string | undefined {
  if (ca == null || ca === '') return ca;
  if (/BEGIN ([A-Z ]*CERTIFICATE|TRUSTED CERTIFICATE)/.test(ca)) {
    return ca;
  }
  const abs = isAbsolute(ca) ? ca : resolvePath(baseDir, ca);
  if (existsSync(abs)) {
    return readFileSync(abs, 'utf8');
  }
  return ca;
}

export default class MySQLHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.MySQLHandler;
  private baseDir: string;
  private importFn: ImportFn;
  private schemaProxy: StoreProxy<GraphQLSchema>;
  private disposableResource?: Disposable | AsyncDisposable;

  constructor({
    name,
    config,
    baseDir,
    store,
    importFn,
  }: MeshHandlerOptions<YamlConfig.MySQLHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.importFn = importFn;
    this.schemaProxy = store.proxy(
      'schema.graphql',
      PredefinedProxyOptions.GraphQLSchemaWithDiffing,
    );
  }

  async getMeshSource(): Promise<MeshSource> {
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
      // Protocol on the endpoint (`mysql://` / `mysqls://`) already selects the adapter.
      // Forward ssl.ca / rejectUnauthorized into transport options (not only the scheme).
      // Resolve filesystem paths (legacy contract) to PEM before mysql2.
      const ssl = this.config.ssl
        ? {
            rejectUnauthorized: this.config.ssl.rejectUnauthorized,
            ca: resolveMysqlSslCa(this.config.ssl.ca, this.baseDir),
          }
        : undefined;
      return loadGraphQLSchemaFromSql(this.name, {
        endpoint: endpointUrl.toString(),
        includeTables: this.config.tables,
        tableFields: this.config.tableFields,
        cwd: this.baseDir,
        ...(ssl
          ? {
              tls: ssl.rejectUnauthorized === false ? 'insecure' : true,
              ssl,
            }
          : {}),
      });
    });

    let client;
    if (this.config.pool != null) {
      const pool =
        typeof this.config.pool === 'string'
          ? await loadFromModuleExportExpression(this.config.pool, {
              cwd: this.baseDir,
              defaultExportName: 'default',
              importFn: this.importFn,
            })
          : this.config.pool;
      client = wrapMysqlPoolAsSqlClient(pool as any);
    }

    const executor = await getSqlExecutor({
      subgraph: schema,
      cwd: this.baseDir,
      client,
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
