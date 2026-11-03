import type { GraphQLSchema } from 'graphql';
import { buildSchema } from 'graphql';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { GetMeshSourcePayload, ImportFn, MeshFetch, MeshHandler, MeshHandlerOptions, MeshSource, YamlConfig } from '@graphql-mesh/types';
import { readFileOrUrl } from '@graphql-mesh/utils';
import { loadNonExecutableGraphQLSchemaFromOpenAPI, processDirectives } from '@omnigraph/openapi';
import { Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';

export default class OpenAPIHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.OpenapiHandler;
  private schemaWithAnnotationsProxy: StoreProxy<GraphQLSchema>;
  private baseDir: string;
  private log: Logger;
  private fetchFn: MeshFetch;
  private pubsub: PubSub;
  private importFn: ImportFn;
  constructor({
    name,
    config,
    baseDir,
    store,
    pubsub,
    log,
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
    this.log = log;
  }

  async getNonExecutableSchema({ interpolatedSource }: { interpolatedSource: string }) {
    if (interpolatedSource.endsWith('.graphql')) {
      this.log.info(`Fetching GraphQL Schema with annotations`);
      const sdl = await readFileOrUrl<string>(interpolatedSource, {
        allowUnknownExtensions: true,
        cwd: this.baseDir,
        fetch: this.fetchFn,
        importFn: this.importFn, log: this.log,
        headers: this.config.schemaHeaders,
      });
      return buildSchema(sdl, {
        assumeValidSDL: true,
        assumeValid: true,
      });
    }
    return this.schemaWithAnnotationsProxy.getWithSet(async () => {
      this.log.info(`Generating GraphQL schema from OpenAPI schema`);
      const schema = await loadNonExecutableGraphQLSchemaFromOpenAPI(this.name, {
        ...this.config,
        source: interpolatedSource,
        cwd: this.baseDir,
        fetch: this.fetchFn, log: this.log,
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
    this.log.debug('Getting the schema with annotations');
    const nonExecutableSchema = await this.getNonExecutableSchema({
      interpolatedSource,
    });
    this.log.info(`Processing annotations for the execution layer`);
    const schemaWithDirectives = processDirectives(nonExecutableSchema, {
      ...this.config,
      pubsub: this.pubsub, log: this.log,
      globalFetch: fetchFn,
    });
    return {
      schema: schemaWithDirectives,
    };
  }
}
