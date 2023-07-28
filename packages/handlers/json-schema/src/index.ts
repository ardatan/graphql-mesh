import { buildSchema, GraphQLSchema } from 'graphql';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import {
  GetMeshSourcePayload,
  ImportFn,
  Logger,
  MeshFetch,
  MeshHandler,
  MeshHandlerOptions,
  MeshPubSub,
  MeshSource,
  YamlConfig,
} from '@graphql-mesh/types';
import { readFileOrUrl } from '@graphql-mesh/utils';
import {
  getGraphQLSchemaFromBundle,
  JSONSchemaLoaderBundle,
  loadNonExecutableGraphQLSchemaFromJSONSchemas,
  processDirectives,
} from '@omnigraph/json-schema';

export default class JsonSchemaHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.Handler['jsonSchema'];
  private schemaWithAnnotationsProxy: StoreProxy<GraphQLSchema>;
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
  }: MeshHandlerOptions<YamlConfig.Handler['jsonSchema']>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.schemaWithAnnotationsProxy = store.proxy(
      'schemaWithAnnotations',
      PredefinedProxyOptions.GraphQLSchemaWithDiffing,
    );
    this.pubsub = pubsub;
    this.logger = logger;
    this.importFn = importFn;
  }

  async getNonExecutableSchema() {
    if (this.config.source) {
      this.logger.info(`Fetching GraphQL Schema with annotations`);
      const sdl = await readFileOrUrl<string>(this.config.source, {
        allowUnknownExtensions: true,
        cwd: this.baseDir,
        fetch: this.fetchFn,
        importFn: this.importFn,
        logger: this.logger,
        headers: this.config.schemaHeaders,
      });
      return buildSchema(sdl, {
        assumeValidSDL: true,
        assumeValid: true,
      });
    }
    return this.schemaWithAnnotationsProxy.getWithSet(async () => {
      if (this.config.bundlePath) {
        this.logger.info(`Fetching JSON Schema bundle`);
        const bundle = await readFileOrUrl<JSONSchemaLoaderBundle>(this.config.bundlePath, {
          allowUnknownExtensions: true,
          cwd: this.baseDir,
          fetch: this.fetchFn,
          importFn: this.importFn,
          logger: this.logger,
          headers: this.config.bundleHeaders,
        });
        return getGraphQLSchemaFromBundle(bundle, {
          cwd: this.baseDir,
          logger: this.logger,
          fetch: this.fetchFn,
          endpoint: this.config.endpoint,
          operationHeaders: this.config.operationHeaders,
          queryParams: this.config.queryParams,
          queryStringOptions: this.config.queryStringOptions,
        });
      }
      this.logger.info(`Generating GraphQL schema from JSON Schemas`);
      return loadNonExecutableGraphQLSchemaFromJSONSchemas(this.name, {
        ...this.config,
        operations: this.config.operations as any,
        cwd: this.baseDir,
        fetch: this.fetchFn,
        logger: this.logger,
        pubsub: this.pubsub,
      });
    });
  }

  async getMeshSource({ fetchFn }: GetMeshSourcePayload): Promise<MeshSource> {
    this.fetchFn = fetchFn;
    this.logger.debug('Getting the schema with annotations');
    const nonExecutableSchema = await this.getNonExecutableSchema();
    this.logger.info(`Processing annotations for the execution layer`);
    const schemaWithDirectives = processDirectives({
      ...this.config,
      schema: nonExecutableSchema,
      pubsub: this.pubsub,
      logger: this.logger,
      globalFetch: fetchFn,
    });
    return {
      schema: schemaWithDirectives,
    };
  }
}
