/* eslint-disable import/no-duplicates */
import type { GraphQLSchema } from 'graphql';
import { buildSchema } from 'graphql';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import { GrpcTransportHelper } from '@graphql-mesh/transport-grpc';
import type {
  ImportFn,
  Logger,
  MeshFetch,
  MeshHandler,
  MeshHandlerOptions,
  MeshPubSub,
  YamlConfig,
} from '@graphql-mesh/types';
import { readFileOrUrl } from '@graphql-mesh/utils';
import { loadGrpcSubgraph } from '@omnigraph/grpc';

export default class GrpcHandler implements MeshHandler {
  private config: YamlConfig.GrpcHandler;
  private baseDir: string;
  private schemaWithAnnotationsProxy: StoreProxy<GraphQLSchema>;
  private logger: Logger;
  private pubsub: MeshPubSub;
  private fetchFn: MeshFetch;
  private importFn: ImportFn;
  private sourceName: string;

  constructor({
    name,
    config,
    baseDir,
    store,
    logger,
    pubsub,
    importFn,
  }: MeshHandlerOptions<YamlConfig.GrpcHandler>) {
    this.logger = logger;
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
      this.logger.info(`Fetching GraphQL Schema with annotations`);
      return readFileOrUrl<string>(interpolatedSource, {
        allowUnknownExtensions: true,
        cwd: this.baseDir,
        fetch: this.fetchFn,
        importFn: this.importFn,
        logger: this.logger,
        headers: this.config.schemaHeaders,
      }).then(sdl => buildSchema(sdl, { assumeValidSDL: true, assumeValid: true }));
    }
    return this.schemaWithAnnotationsProxy.getWithSet(
      () =>
        loadGrpcSubgraph(this.sourceName, this.config)({ cwd: this.baseDir, logger: this.logger })
          .schema$,
    );
  }

  getMeshSource() {
    const transport = new GrpcTransportHelper(
      this.sourceName,
      this.baseDir,
      this.logger,
      this.config.endpoint,
      this.config,
    );
    const subId = this.pubsub.subscribe('destroy', () => {
      transport.dispose();
      this.pubsub.unsubscribe(subId);
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
