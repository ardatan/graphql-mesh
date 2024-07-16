import type { GraphQLSchema } from 'graphql';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import type {
  GetMeshSourcePayload,
  ImportFn,
  Logger,
  MeshHandler,
  MeshHandlerOptions,
  MeshSource,
  YamlConfig,
} from '@graphql-mesh/types';
import { getThriftExecutor, loadNonExecutableGraphQLSchemaFromIDL } from '@omnigraph/thrift';

export default class ThriftHandler implements MeshHandler {
  private config: YamlConfig.ThriftHandler;
  private baseDir: string;
  private sdl: StoreProxy<GraphQLSchema>;
  private importFn: ImportFn;
  private logger: Logger;
  private subgraphName: string;

  constructor({
    config,
    baseDir,
    store,
    importFn,
    logger,
    name,
  }: MeshHandlerOptions<YamlConfig.ThriftHandler>) {
    this.subgraphName = name;
    this.config = config;
    this.baseDir = baseDir;
    this.sdl = store.proxy(
      'schemaWithAnnotations',
      PredefinedProxyOptions.GraphQLSchemaWithDiffing,
    );
    this.importFn = importFn;
    this.logger = logger;
  }

  private buildEndpointUrl() {
    const { hostName, port, path, https } = this.config;
    const protocol = https ? 'https' : 'http';
    return `${protocol}://${hostName}:${port}${path}`;
  }

  async getMeshSource({ fetchFn }: GetMeshSourcePayload): Promise<MeshSource> {
    const schema = await this.sdl.getWithSet(() =>
      loadNonExecutableGraphQLSchemaFromIDL({
        subgraphName: this.subgraphName,
        source: this.config.idl,
        endpoint: this.buildEndpointUrl(),
        operationHeaders: this.config.operationHeaders,
        serviceName: this.config.serviceName,
        baseDir: this.baseDir,
        fetchFn,
        logger: this.logger,
        importFn: this.importFn,
      }),
    );

    return {
      schema,
      executor: getThriftExecutor(schema),
    };
  }
}
