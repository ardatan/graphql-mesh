import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import {
  MeshHandlerOptions,
  ImportFn,
  Logger,
  MeshHandler,
  MeshPubSub,
  MeshSource,
  YamlConfig,
  GetMeshSourcePayload,
  MeshFetch,
} from '@graphql-mesh/types';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { createBundle, getGraphQLSchemaFromBundle, OpenAPILoaderBundle } from '@omnigraph/openapi';

export default class OpenAPIHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.OpenapiHandler;
  private bundleStoreProxy: StoreProxy<OpenAPILoaderBundle>;
  private baseDir: string;
  private logger: Logger;
  private fetchFn: MeshFetch;
  private pubsub: MeshPubSub;
  private importFn: ImportFn;
  constructor({
    name,
    config,
    baseDir,
    store,
    pubsub,
    logger,
    importFn,
  }: MeshHandlerOptions<YamlConfig.OpenapiHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.bundleStoreProxy = store.proxy('jsonSchemaBundle', PredefinedProxyOptions.JsonWithoutValidation);
    this.pubsub = pubsub;
    this.logger = logger;
    this.importFn = importFn;
  }

  async getDereferencedBundle() {
    return this.bundleStoreProxy.getWithSet(() => {
      this.logger?.debug('Creating the bundle');
      return createBundle(this.name, {
        ...this.config,
        cwd: this.baseDir,
        fetch: this.fetchFn,
        logger: this.logger,
        ignoreErrorResponses: this.config.ignoreErrorResponses,
        selectQueryOrMutationField: this.config.selectQueryOrMutationField?.map(({ type, fieldName }) => ({
          type: type.toLowerCase() as any,
          fieldName,
        })),
        fallbackFormat: this.config.fallbackFormat,
        operationHeaders: typeof this.config.operationHeaders === 'string' ? {} : this.config.operationHeaders,
      });
    });
  }

  async getMeshSource({ fetchFn }: GetMeshSourcePayload): Promise<MeshSource> {
    this.fetchFn = fetchFn;
    this.logger?.debug('Getting the bundle');
    const bundle = await this.getDereferencedBundle();
    this.logger?.debug('Generating GraphQL Schema from bundle');
    const operationHeadersConfig =
      typeof this.config.operationHeaders === 'string'
        ? await loadFromModuleExportExpression<Record<string, string>>(this.config.operationHeaders, {
            cwd: this.baseDir,
            importFn: this.importFn,
            defaultExportName: 'default',
          })
        : this.config.operationHeaders;
    const schema = await getGraphQLSchemaFromBundle(bundle, {
      cwd: this.baseDir,
      fetch: this.fetchFn,
      pubsub: this.pubsub,
      logger: this.logger,
      baseUrl: this.config.baseUrl,
      operationHeaders: operationHeadersConfig,
    });
    return {
      schema,
    };
  }
}
