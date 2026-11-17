import { buildSchema, isObjectType, type GraphQLSchema } from 'graphql';
import { type Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import { ProtobufTransportHelper } from '@graphql-mesh/transport-protobuf';
import type {
  ImportFn,
  MeshFetch,
  MeshHandler,
  MeshHandlerOptions,
  YamlConfig,
} from '@graphql-mesh/types';
import { readFileOrUrl } from '@graphql-mesh/utils';
import { getDirectives } from '@graphql-tools/utils';
import { loadProtobufSubgraph } from '@omnigraph/protobuf';
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
  private transport?: ProtobufTransportHelper;

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
      }).then(sdl => {
        const schema = buildSchema(sdl, { assumeValidSDL: true, assumeValid: true });
        assertProtobufRpcAnnotations(schema, interpolatedSource);
        return schema;
      });
    }
    return this.schemaWithAnnotationsProxy.getWithSet(
      () =>
        loadProtobufSubgraph(this.sourceName, this.config)({ cwd: this.baseDir, log: this.log })
          .schema$,
    );
  }

  getMeshSource() {
    this.transport = new ProtobufTransportHelper(
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

/**
 * Legacy `@grpcMethod` SDL caches are not executable by the protobuf transport
 * (needs `@protobuf__rpc` with typed args/selection mappings). Fail fast instead
 * of serving a schema with no resolvers.
 */
function assertProtobufRpcAnnotations(schema: GraphQLSchema, source: string): void {
  let hasGrpcMethod = false;
  let hasProtobufRpc = false;
  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type) || type.name.startsWith('__')) continue;
    for (const directive of getDirectives(schema, type) || []) {
      if (directive.name === 'grpcMethod' || directive.name === 'grpc__method') {
        hasGrpcMethod = true;
      }
      if (directive.name === 'protobuf__rpc' || directive.name === 'protobufRpc') {
        hasProtobufRpc = true;
      }
    }
    for (const field of Object.values(type.getFields())) {
      for (const directive of getDirectives(schema, field) || []) {
        if (directive.name === 'grpcMethod' || directive.name === 'grpc__method') {
          hasGrpcMethod = true;
        }
        if (directive.name === 'protobuf__rpc' || directive.name === 'protobufRpc') {
          hasProtobufRpc = true;
        }
      }
    }
  }
  if (hasGrpcMethod && !hasProtobufRpc) {
    throw new Error(
      `Legacy @grpcMethod annotations in ${source} are not executed by @graphql-mesh/transport-protobuf. Recompose the subgraph from .proto / reflection so @protobuf__rpc(args, selection) mappings are emitted.`,
    );
  }
}
