import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import {
  GetMeshSourceOptions,
  ImportFn,
  Logger,
  MeshHandler,
  MeshPubSub,
  MeshSource,
  YamlConfig,
} from '@graphql-mesh/types';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { createBundle, getGraphQLSchemaFromBundle, OpenAPILoaderBundle } from '@omnigraph/openapi';

export default class OpenAPIHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.OpenapiHandler;
  private bundleStoreProxy: StoreProxy<OpenAPILoaderBundle>;
  private baseDir: string;
  private logger: Logger;
  private fetch: typeof fetch;
  private pubsub: MeshPubSub;
  private importFn: ImportFn;
  constructor({
    name,
    config,
    baseDir,
    fetchFn,
    store,
    pubsub,
    logger,
    importFn,
  }: GetMeshSourceOptions<YamlConfig.OpenapiHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.fetch = fetchFn;
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
        fetch: this.fetch,
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

  async getMeshSource(): Promise<MeshSource> {
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
      fetch: this.fetch,
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
