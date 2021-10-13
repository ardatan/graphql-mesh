import { StoreProxy } from '@graphql-mesh/store';
import { GetMeshSourceOptions, KeyValueCache, Logger, MeshHandler, MeshPubSub, YamlConfig } from '@graphql-mesh/types';
import { JsonSchemaWithDiff } from './JsonSchemaWithDiff';
import { JSONSchemaObject } from 'json-machete';
import { bundleJSONSchemas, getGraphQLSchemaFromBundledJSONSchema } from '@omnigraph/json-schema';
import { getCachedFetch } from '@graphql-mesh/utils';

export default class JsonSchemaHandler implements MeshHandler {
  private config: YamlConfig.JsonSchemaHandler;
  private baseDir: string;
  public cache: KeyValueCache<any>;
  public pubsub: MeshPubSub;
  public jsonSchema: StoreProxy<JSONSchemaObject>;
  private logger: Logger;

  constructor({ config, baseDir, cache, pubsub, store, logger }: GetMeshSourceOptions<YamlConfig.JsonSchemaHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
    this.pubsub = pubsub;
    this.jsonSchema = store.proxy('jsonSchema.json', JsonSchemaWithDiff);
    this.logger = logger;
  }

  async getMeshSource() {
    const bundledJSONSchema = await this.jsonSchema.getWithSet(() =>
      bundleJSONSchemas({
        operations: this.config.operations as any,
        cwd: this.baseDir,
        logger: this.logger,
      })
    );
    const schema = await getGraphQLSchemaFromBundledJSONSchema(bundledJSONSchema, {
      cwd: this.baseDir,
      fetch: getCachedFetch(this.cache),
      logger: this.logger,
      operations: this.config.operations as any,
      operationHeaders: this.config.operationHeaders,
      baseUrl: this.config.baseUrl,
      pubsub: this.pubsub,
      errorMessage: this.config.errorMessage,
    });
    return {
      schema,
    };
  }
}
