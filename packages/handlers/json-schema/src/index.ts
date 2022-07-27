import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import { GetMeshSourceOptions, ImportFn, Logger, MeshHandler, MeshPubSub, YamlConfig } from '@graphql-mesh/types';
import { JSONSchemaLoaderBundle, createBundle, getGraphQLSchemaFromBundle } from '@omnigraph/json-schema';
import { readFileOrUrl } from '@graphql-mesh/utils';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import { process } from '@graphql-mesh/cross-helpers';

export default class JsonSchemaHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.Handler['jsonSchema'];
  private bundleStoreProxy: StoreProxy<JSONSchemaLoaderBundle>;
  private baseDir: string;
  private logger: Logger;
  private fetchFn: typeof fetch;
  private importFn: ImportFn;
  private pubsub: MeshPubSub;

  constructor({
    name,
    config,
    baseDir,
    store,
    pubsub,
    logger,
    importFn,
    fetchFn,
  }: GetMeshSourceOptions<YamlConfig.Handler['jsonSchema']>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.fetchFn = fetchFn;
    this.importFn = importFn;
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
        fetch: this.fetchFn,
        logger: this.logger,
        headers: headersFactory({
          env: process.env,
        }),
        fallbackFormat: 'json',
        importFn: this.importFn,
      });
      return bundle;
    } else {
      return this.bundleStoreProxy.getWithSet(() => {
        return createBundle(this.name, {
          ...config,
          operations: config.operations as any,
          cwd: this.baseDir,
          fetch: this.fetchFn,
          logger: this.logger,
        });
      });
    }
  }

  async getMeshSource() {
    const bundle = await this.getDereferencedBundle();
    const schema = await getGraphQLSchemaFromBundle(bundle, {
      cwd: this.baseDir,
      fetch: this.fetchFn,
      pubsub: this.pubsub,
      logger: this.logger,
      baseUrl: this.config.baseUrl,
      operationHeaders: this.config.operationHeaders,
      queryStringOptions: this.config.queryStringOptions,
    });
    return {
      schema,
    };
  }
}
