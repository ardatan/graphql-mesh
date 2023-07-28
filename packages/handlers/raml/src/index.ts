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
import { loadNonExecutableGraphQLSchemaFromRAML, processDirectives } from '@omnigraph/raml';

export default class RAMLHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.RAMLHandler;
  private schemaWithAnnotationsProxy: StoreProxy<GraphQLSchema>;
  private bundleProxy: StoreProxy<any>;
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
  }: MeshHandlerOptions<YamlConfig.RAMLHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.schemaWithAnnotationsProxy = store.proxy(
      'schemaWithAnnotations',
      PredefinedProxyOptions.GraphQLSchemaWithDiffing,
    );
    this.bundleProxy = store.proxy(
      'jsonSchemaBundle',
      PredefinedProxyOptions.JsonWithoutValidation,
    );
    this.pubsub = pubsub;
    this.importFn = importFn;
    this.logger = logger;
  }

  async getNonExecutableSchema() {
    if (this.config.source.endsWith('.graphql')) {
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
      this.logger.info(`Generating GraphQL schema from RAML schema`);
      const schema = await loadNonExecutableGraphQLSchemaFromRAML(this.name, {
        ...this.config,
        cwd: this.baseDir,
        fetch: this.fetchFn,
        logger: this.logger,
        ignoreErrorResponses: this.config.ignoreErrorResponses,
        selectQueryOrMutationField: this.config.selectQueryOrMutationField?.map(
          ({ type, fieldName }) => ({
            type: type.toLowerCase() as any,
            fieldName,
          }),
        ),
        pubsub: this.pubsub,
        bundle: this.config.bundle,
      });
      if (this.config.bundle) {
        await this.bundleProxy.set(schema.extensions!.bundle);
      }
      return schema;
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
