import type { GraphQLSchema } from 'graphql';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type {
  ImportFn,
  MeshHandler,
  MeshHandlerOptions,
  MeshSource,
  YamlConfig,
} from '@graphql-mesh/types';
import { dispose, isDisposable } from '@graphql-mesh/utils';
import {
  getMongoExecutor,
  loadGraphQLSchemaFromMongo,
  type MongoModelConfig,
} from '@omnigraph/mongo';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

/**
 * Legacy v0 Mongoose handler. Under the hood `@omnigraph/mongo` + `transport-mongo`.
 * YAML entrypoint stays the same (`connectionString` / `models` / `discriminators`);
 * Mongoose is bootstrap-only, runtime is the native MongoDB driver via `@mongo`.
 */
export default class MongooseHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.MongooseHandler;
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
  }: MeshHandlerOptions<YamlConfig.MongooseHandler>) {
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
    const endpoint = this.config.connectionString
      ? stringInterpolator.parse(this.config.connectionString, {
          env: globalThis.process?.env,
        })
      : 'mongodb://localhost:27017/test';

    const models: MongoModelConfig[] = [
      ...(this.config.models || []).map(m => ({
        name: m.name,
        path: m.path,
        options: m.options
          ? {
              fields: m.options.fields
                ? {
                    only: m.options.fields.only,
                    remove: m.options.fields.remove,
                    required: m.options.fields.required,
                  }
                : undefined,
            }
          : undefined,
      })),
      // Discriminators currently bootstrap like ordinary models (schema emit).
      // Discriminator-key filtering / subtype compose is a follow-up.
      ...(this.config.discriminators || []).map(m => ({
        name: m.name,
        path: m.path,
        options: m.options
          ? {
              fields: m.options.fields
                ? {
                    only: m.options.fields.only,
                    remove: m.options.fields.remove,
                    required: m.options.fields.required,
                  }
                : undefined,
            }
          : undefined,
      })),
    ];

    if (!models.length) {
      throw new Error(
        '@graphql-mesh/mongoose: provide at least one entry under `models` (or `discriminators`).',
      );
    }

    const schema = await this.schemaProxy.getWithSet(() =>
      loadGraphQLSchemaFromMongo(this.name, {
        endpoint,
        models,
        cwd: this.baseDir,
        importFn: this.importFn,
      }),
    );

    // Always bind the executor to the current interpolated endpoint — schema
    // cache may still carry a stale `@transport(location:)` from an earlier run.
    const executor = getMongoExecutor({
      subgraph: schema,
      cwd: this.baseDir,
      location: endpoint,
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
