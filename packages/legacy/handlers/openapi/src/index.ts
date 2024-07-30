import type { GraphQLSchema } from 'graphql';
import { buildSchema } from 'graphql';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type {
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
import { loadNonExecutableGraphQLSchemaFromOpenAPI, processDirectives } from '@omnigraph/openapi';

export default class OpenAPIHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.OpenapiHandler;
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
  }: MeshHandlerOptions<YamlConfig.OpenapiHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.schemaWithAnnotationsProxy = store.proxy(
      'schemaWithAnnotations',
      PredefinedProxyOptions.GraphQLSchemaWithDiffing,
    );
    this.pubsub = pubsub;
    this.importFn = importFn;
    this.logger = logger;
  }

  async getNonExecutableSchema({ interpolatedSource }: { interpolatedSource: string }) {
    if (interpolatedSource.endsWith('.graphql')) {
      this.logger.info(`Fetching GraphQL Schema with annotations`);
      const sdl = await readFileOrUrl<string>(interpolatedSource, {
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
      this.logger.info(`Generating GraphQL schema from OpenAPI schema`);
      const schema = await loadNonExecutableGraphQLSchemaFromOpenAPI(this.name, {
        ...this.config,
        source: interpolatedSource,
        cwd: this.baseDir,
        fetch: this.fetchFn,
        logger: this.logger,
        selectQueryOrMutationField: this.config.selectQueryOrMutationField?.map(
          ({ type, fieldName }) => ({
            type: type.toLowerCase() as any,
            fieldName,
          }),
        ),
        pubsub: this.pubsub,
      });
      return schema;
    });
  }

  async getMeshSource({ fetchFn }: GetMeshSourcePayload): Promise<MeshSource> {
    const interpolatedSource = stringInterpolator.parse(this.config.source, {
      env: process.env,
    });
    this.fetchFn = fetchFn;
    this.logger.debug('Getting the schema with annotations');
    const nonExecutableSchema = await this.getNonExecutableSchema({
      interpolatedSource,
    });
    this.logger.info(`Processing annotations for the execution layer`);
    const schemaWithDirectives = processDirectives(nonExecutableSchema, {
      ...this.config,
      pubsub: this.pubsub,
      logger: this.logger,
      globalFetch: fetchFn,
    });
    return {
      schema: schemaWithDirectives,
    };
  }
}
