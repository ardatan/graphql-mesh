import type { GraphQLSchema } from 'graphql';
import { buildSchema } from 'graphql';
import { type Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import type {
  GetMeshSourcePayload,
  ImportFn,
  MeshFetch,
  MeshHandler,
  MeshHandlerOptions,
  MeshSource,
  YamlConfig,
} from '@graphql-mesh/types';
import { readFileOrUrl } from '@graphql-mesh/utils';
import { loadNonExecutableGraphQLSchemaFromRAML, processDirectives } from '@omnigraph/raml';

export default class RAMLHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.RAMLHandler;
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
  }: MeshHandlerOptions<YamlConfig.RAMLHandler>) {
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

  async getNonExecutableSchema() {
    if (this.config.source.endsWith('.graphql')) {
      this.log.info(`Fetching GraphQL Schema with annotations`);
      const sdl = await readFileOrUrl<string>(this.config.source, {
        allowUnknownExtensions: true,
        cwd: this.baseDir,
        fetch: this.fetchFn,
        importFn: this.importFn,
        log: this.log,
        headers: this.config.schemaHeaders,
      });
      return buildSchema(sdl, {
        assumeValidSDL: true,
        assumeValid: true,
      });
    }
    return this.schemaWithAnnotationsProxy.getWithSet(async () => {
      this.log.info(`Generating GraphQL schema from RAML schema`);
      const schema = await loadNonExecutableGraphQLSchemaFromRAML(this.name, {
        ...this.config,
        cwd: this.baseDir,
        fetch: this.fetchFn,
        log: this.log,
        ignoreErrorResponses: this.config.ignoreErrorResponses,
        selectQueryOrMutationField: this.config.selectQueryOrMutationField?.map(
          ({ type, fieldName }) => ({
            type: type.toLowerCase() as any,
            fieldName,
          }),
        ),
        pubsub: this.pubsub,
        // Mesh v0 (.meshrc) is Hive-only: `$` passthrough for oversized selections.
        connectSelection: { overLimit: 'passthrough' },
      });
      return schema;
    });
  }

  async getMeshSource({ fetchFn }: GetMeshSourcePayload): Promise<MeshSource> {
    this.fetchFn = fetchFn;

    this.log.debug('Getting the schema with annotations');
    const nonExecutableSchema = await this.getNonExecutableSchema();
    this.log.info(`Processing annotations for the execution layer`);
    const schemaWithDirectives = processDirectives(nonExecutableSchema, {
      ...this.config,
      pubsub: this.pubsub,
      log: this.log,
      globalFetch: fetchFn,
    });
    return {
      schema: schemaWithDirectives,
    };
  }
}
