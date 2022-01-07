import { StoreProxy } from '@graphql-mesh/store';
import { GetMeshSourceOptions, KeyValueCache, Logger, MeshHandler, MeshPubSub, YamlConfig } from '@graphql-mesh/types';
import { JsonSchemaWithDiff } from './JsonSchemaWithDiff';
import { dereferenceObject, JSONSchemaObject, referenceJSONSchema } from 'json-machete';
import {
  getDereferencedJSONSchemaFromOperations,
  getGraphQLSchemaFromDereferencedJSONSchema,
} from '@omnigraph/json-schema';
import { getCachedFetch } from '@graphql-mesh/utils';

export default class JsonSchemaHandler implements MeshHandler {
  private config: YamlConfig.JsonSchemaHandler;
  private baseDir: string;
  public cache: KeyValueCache<any>;
  public pubsub: MeshPubSub;
  public jsonSchema: StoreProxy<JSONSchemaObject>;
  private logger: Logger;
  private fetch: WindowOrWorkerGlobalScope['fetch'];

  constructor({ config, baseDir, cache, pubsub, store, logger }: GetMeshSourceOptions<YamlConfig.JsonSchemaHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
    this.pubsub = pubsub;
    this.jsonSchema = store.proxy('jsonSchema.json', JsonSchemaWithDiff);
    this.logger = logger;
    this.fetch = getCachedFetch(this.cache);
  }

  async getDereferencedSchema() {
    const cachedSchema = await this.jsonSchema.get();
    if (cachedSchema) {
      return dereferenceObject(cachedSchema, {
        cwd: this.baseDir,
        fetch: this.fetch,
      });
    } else {
      const dereferencedSchema = await getDereferencedJSONSchemaFromOperations({
        operations: this.config.operations as any,
        cwd: this.baseDir,
        logger: this.logger,
        fetch: this.fetch,
      });
      const referencedSchema = await referenceJSONSchema(dereferencedSchema);
      await this.jsonSchema.set(referencedSchema);
      return dereferencedSchema;
    }
  }

  async getMeshSource() {
    const fullyDereferencedSchema = await this.getDereferencedSchema();
    const schema = await getGraphQLSchemaFromDereferencedJSONSchema(fullyDereferencedSchema, {
      fetch: this.fetch,
      logger: this.logger,
      operations: this.config.operations as any,
      operationHeaders: this.config.operationHeaders,
      baseUrl: this.config.baseUrl,
      pubsub: this.pubsub,
      throwOnHttpError: this.config.throwOnHttpError,
    });
    return {
      schema,
    };
  }
}
