import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import {
  MeshHandlerOptions,
  Logger,
  MeshHandler,
  MeshPubSub,
  MeshSource,
  YamlConfig,
  GetMeshSourcePayload,
  MeshFetch,
} from '@graphql-mesh/types';
import { createBundle, getGraphQLSchemaFromBundle, RAMLLoaderBundle } from '@omnigraph/raml';

export default class RAMLHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.RAMLHandler;
  private bundleStoreProxy: StoreProxy<RAMLLoaderBundle>;
  private baseDir: string;
  private logger: Logger;
  private fetchFn: MeshFetch;
  private pubsub: MeshPubSub;
  constructor({ name, config, baseDir, store, pubsub, logger }: MeshHandlerOptions<YamlConfig.RAMLHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.bundleStoreProxy = store.proxy('jsonSchemaBundle', PredefinedProxyOptions.JsonWithoutValidation);
    this.pubsub = pubsub;
    this.logger = logger;
  }

  async getDereferencedBundle() {
    return this.bundleStoreProxy.getWithSet(() => {
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
      });
    });
  }

  async getMeshSource({ fetchFn }: GetMeshSourcePayload): Promise<MeshSource> {
    this.fetchFn = fetchFn;
    const bundle = await this.getDereferencedBundle();
    const schema = await getGraphQLSchemaFromBundle(bundle, {
      cwd: this.baseDir,
      fetch: this.fetchFn,
      pubsub: this.pubsub,
      logger: this.logger,
      baseUrl: this.config.baseUrl,
      operationHeaders: this.config.operationHeaders,
    });
    return {
      schema,
    };
  }
}
