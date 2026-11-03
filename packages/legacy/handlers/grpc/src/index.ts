import type { GraphQLSchema } from 'graphql';
import { buildSchema } from 'graphql';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import { GrpcTransportHelper } from '@graphql-mesh/transport-grpc';
import type { ImportFn, MeshFetch, MeshHandler, MeshHandlerOptions, HivePubSub, YamlConfig } from '@graphql-mesh/types';
import { readFileOrUrl } from '@graphql-mesh/utils';
import { loadGrpcSubgraph } from '@omnigraph/grpc';
import { Logger } from '@graphql-hive/logger';

export default class GrpcHandler implements MeshHandler {
  private config: YamlConfig.GrpcHandler;
  private baseDir: string;
  private schemaWithAnnotationsProxy: StoreProxy<GraphQLSchema>;
  private log: Logger;
  private pubsub: HivePubSub;
  private disposables?: AsyncDisposableStack;
  private fetchFn: MeshFetch;
  private importFn: ImportFn;
  private sourceName: string;

  constructor({
    name,
    config,
    baseDir,
    store,
    log,
    pubsub,
    disposables,
    importFn,
  }: MeshHandlerOptions<YamlConfig.GrpcHandler>) {
    this.log = log;
    this.config = config;
    this.baseDir = baseDir;
    this.schemaWithAnnotationsProxy = store.proxy(
      'schemaWithAnnotations',
      PredefinedProxyOptions.GraphQLSchemaWithDiffing,
    );
    this.pubsub = pubsub;
    this.disposables = disposables;
    this.importFn = importFn;
    this.sourceName = name;
  }

  private getCachedNonExecutableSchema() {
    const interpolatedSource = this.config.source?.toString();
    if (interpolatedSource?.endsWith('.graphql')) {
      this.log.info(`Fetching GraphQL Schema with annotations`);
      return readFileOrUrl<string>(interpolatedSource, {
        allowUnknownExtensions: true,
        cwd: this.baseDir,
        fetch: this.fetchFn,
        importFn: this.importFn, log: this.log,
        headers: this.config.schemaHeaders,
      }).then(sdl => buildSchema(sdl, { assumeValidSDL: true, assumeValid: true }));
    }
    return this.schemaWithAnnotationsProxy.getWithSet(
      () =>
        loadGrpcSubgraph(this.sourceName, this.config)({ cwd: this.baseDir, log: this.log })
          .schema$,
    );
  }

  getMeshSource() {
    const transport = new GrpcTransportHelper(
      this.sourceName,
      this.baseDir,
      this.log,
      this.config.endpoint,
      this.config,
    );
    this.disposables?.defer(() => {
      transport.dispose();
    });
    return Promise.all([transport.getCredentials(), this.getCachedNonExecutableSchema()]).then(
      ([creds, schema]) => {
        transport.processDirectives({ schema, creds });
        return {
          schema,
        };
      },
    );
  }
}
