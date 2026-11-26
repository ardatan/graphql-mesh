import { buildSchema, isObjectType, type DirectiveNode, type GraphQLSchema } from 'graphql';
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
    return this.schemaWithAnnotationsProxy
      .getWithSet(
        () =>
          loadProtobufSubgraph(this.sourceName, this.config)({ cwd: this.baseDir, log: this.log })
            .schema$,
      )
      .then(schema => {
        // Cached schemas (validate=false) skip the setter — still fail fast on legacy @grpcMethod.
        assertProtobufRpcAnnotations(schema, interpolatedSource || this.sourceName);
        return schema;
      });
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
        // processDirectives may rebuild via ensureFederationEntitiesField/mapSchema —
        // callers must use the returned schema (installQueryField contract).
        const processedSchema = this.transport!.processDirectives({ schema, creds });
        return {
          schema: processedSchema,
        };
      },
    );
  }

  [DisposableSymbols.dispose]() {
    this.transport?.dispose();
  }
}

const LEGACY_GRPC_METHOD = new Set(['grpcMethod', 'grpc__method']);
const PROTOBUF_RPC = new Set(['protobuf__rpc', 'protobufRpc']);

function directiveNames(directives: readonly DirectiveNode[] | undefined): Set<string> {
  const names = new Set<string>();
  for (const directive of directives || []) {
    names.add(directive.name.value);
  }
  return names;
}

function hasLegacyGrpcOnly(names: Set<string>): boolean {
  const hasGrpc = [...LEGACY_GRPC_METHOD].some(n => names.has(n));
  const hasProtobuf = [...PROTOBUF_RPC].some(n => names.has(n));
  return hasGrpc && !hasProtobuf;
}

/**
 * Legacy `@grpcMethod` SDL caches are not executable by the protobuf transport
 * (needs `@protobuf__rpc` with typed args/selection mappings). Fail fast when any
 * field/type still has only `@grpcMethod` — even if another field already has
 * `@protobuf__rpc` (mixed SDL).
 */
export function assertProtobufRpcAnnotations(schema: GraphQLSchema, source: string): void {
  const unsupported: string[] = [];
  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type) || type.name.startsWith('__')) continue;
    const typeDirs = directiveNames([
      ...(type.astNode?.directives || []),
      ...(type.extensionASTNodes?.flatMap(n => n.directives || []) || []),
    ]);
    if (hasLegacyGrpcOnly(typeDirs)) {
      unsupported.push(type.name);
    }
    for (const field of Object.values(type.getFields())) {
      const fieldDirs = directiveNames(field.astNode?.directives);
      if (hasLegacyGrpcOnly(fieldDirs)) {
        unsupported.push(`${type.name}.${field.name}`);
      }
    }
  }
  if (unsupported.length) {
    throw new Error(
      `Legacy @grpcMethod annotations without @protobuf__rpc in ${source} are not executed by @graphql-mesh/transport-protobuf (${unsupported.join(', ')}). Recompose the subgraph from .proto / reflection so @protobuf__rpc(args, selection) mappings are emitted.`,
    );
  }
}
