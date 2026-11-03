import type { GraphQLSchema } from 'graphql';
import { buildSchema } from 'graphql';
import { type Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import { GrpcTransportHelper } from '@graphql-mesh/transport-grpc';
import type {
  ImportFn,
  MeshFetch,
  MeshHandler,
  MeshHandlerOptions,
  YamlConfig,
} from '@graphql-mesh/types';
import { readFileOrUrl } from '@graphql-mesh/utils';
import { loadGrpcSubgraph } from '@omnigraph/grpc';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

export default class GrpcHandler implements MeshHandler {
  private config: YamlConfig.GrpcHandler;
  private baseDir: string;
  private schemaWithAnnotationsProxy: StoreProxy<GraphQLSchema>;
  private log: Logger;
  private pubsub: PubSub;
  private fetchFn: MeshFetch;
  private importFn: ImportFn;
  private sourceName: string;
  private transport?: GrpcTransportHelper;

  constructor({
    name,
    config,
    baseDir,
    store,
    log,
    pubsub,
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
        importFn: this.importFn,
        log: this.log,
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
    this.transport = new GrpcTransportHelper(
      this.sourceName,
      this.baseDir,
      this.log,
      this.config.endpoint,
      this.config,
    );
    return Promise.all([this.transport.getCredentials(), this.getCachedNonExecutableSchema()]).then(
      ([creds, schema]) => {
        this.transport!.processDirectives({ schema, creds });
        return {
          schema,
        };
      },
    );
  }

  [DisposableSymbols.dispose]() {
    this.transport?.dispose();
  }
}
