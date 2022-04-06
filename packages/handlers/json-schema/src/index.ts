import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import { GetMeshSourceOptions, Logger, MeshHandler, MeshPubSub, YamlConfig } from '@graphql-mesh/types';
import { JSONSchemaLoaderBundle, createBundle, getGraphQLSchemaFromBundle } from '@omnigraph/json-schema';
import { getCachedFetch, getInterpolatedHeadersFactory, readFileOrUrl } from '@graphql-mesh/utils';

export default class JsonSchemaHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.Handler['jsonSchema'];
  private bundleStoreProxy: StoreProxy<JSONSchemaLoaderBundle>;
  private baseDir: string;
  private logger: Logger;
  private fetch: typeof fetch;
  private pubsub: MeshPubSub;

  constructor({
    name,
    config,
    baseDir,
    cache,
    store,
    pubsub,
    logger,
  }: GetMeshSourceOptions<YamlConfig.Handler['jsonSchema']>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.fetch = getCachedFetch(cache);
    this.bundleStoreProxy = store.proxy('jsonSchemaBundle', PredefinedProxyOptions.JsonWithoutValidation);
    this.pubsub = pubsub;
    this.logger = logger;
  }

  async getDereferencedBundle() {
    const config = this.config;
    if ('bundlePath' in config) {
      const headersFactory = getInterpolatedHeadersFactory(config.bundleHeaders);
      const bundle = await readFileOrUrl<JSONSchemaLoaderBundle>(config.bundlePath, {
        cwd: this.baseDir,
        fetch: this.fetch,
        logger: this.logger,
        headers: headersFactory({
          env: process.env,
        }),
        fallbackFormat: 'json',
      });
      return bundle;
    } else {
      return this.bundleStoreProxy.getWithSet(() => {
        return createBundle(this.name, {
          ...config,
          operations: config.operations as any,
          cwd: this.baseDir,
          fetch: this.fetch,
          logger: this.logger,
        });
      });
    }
  }

  async getMeshSource() {
    const bundle = await this.getDereferencedBundle();
    const schema = await getGraphQLSchemaFromBundle(bundle, {
      cwd: this.baseDir,
      fetch: this.fetch,
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
