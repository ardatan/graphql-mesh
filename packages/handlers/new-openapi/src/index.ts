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
import { createBundle, getGraphQLSchemaFromBundle, OpenAPILoaderBundle } from '@omnigraph/openapi';

export default class OpenAPIHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.NewOpenapiHandler;
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
  }: GetMeshSourceOptions<YamlConfig.NewOpenapiHandler>) {
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
      });
    });
  }

  async getMeshSource(): Promise<MeshSource> {
    this.logger?.debug('Getting the bundle');
    const bundle = await this.getDereferencedBundle();
    this.logger?.debug('Generating GraphQL Schema from bundle');
    const operationHeadersConfig =
      typeof this.config.operationHeaders === 'string'
        ? this.importFn(this.config.operationHeaders)
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
