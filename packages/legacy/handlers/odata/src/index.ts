import type { GraphQLSchema } from 'graphql';
import { PredefinedProxyOptions, type StoreProxy } from '@graphql-mesh/store';
import type {
  GetMeshSourcePayload,
  ImportFn,
  Logger,
  MeshHandler,
  MeshHandlerOptions,
  MeshSource,
  YamlConfig,
} from '@graphql-mesh/types';
import { loadNonExecutableGraphQLSchemaFromOData, processDirectives } from '@omnigraph/odata';

export default class ODataHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.ODataHandler;
  private logger: Logger;
  private importFn: ImportFn;
  private baseDir: string;
  private schema: StoreProxy<GraphQLSchema>;

  constructor({
    name,
    config,
    baseDir,
    importFn,
    logger,
    store,
  }: MeshHandlerOptions<YamlConfig.ODataHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.importFn = importFn;
    this.logger = logger;
    this.schema = store.proxy('schema.graphql', PredefinedProxyOptions.GraphQLSchemaWithDiffing);
  }

  async getMeshSource({ fetchFn }: GetMeshSourcePayload): Promise<MeshSource> {
    let schema = await this.schema.getWithSet(() =>
      loadNonExecutableGraphQLSchemaFromOData(this.name, {
        endpoint: this.config.endpoint,
        source: this.config.source,
        baseDir: this.baseDir,
        schemaHeaders: this.config.schemaHeaders,
        operationHeaders: this.config.operationHeaders,
        fetchFn,
        logger: this.logger,
        importFn: this.importFn,
        batch: this.config.batch,
        expandNavProps: this.config.expandNavProps,
      }),
    );
    schema = processDirectives({
      schema,
      fetchFn,
    });
    return {
      schema,
    };
  }
}
