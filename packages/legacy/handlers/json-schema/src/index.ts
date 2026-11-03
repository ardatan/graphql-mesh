import type { GraphQLSchema } from 'graphql';
import { buildSchema } from 'graphql';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import type { GetMeshSourcePayload, ImportFn, MeshFetch, MeshHandler, MeshHandlerOptions, HivePubSub, MeshSource, YamlConfig } from '@graphql-mesh/types';
import { readFileOrUrl } from '@graphql-mesh/utils';
import { Logger } from '@graphql-hive/logger';

import {
  loadNonExecutableGraphQLSchemaFromJSONSchemas,
  processDirectives,
} from '@omnigraph/json-schema';

export default class JsonSchemaHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.Handler['jsonSchema'];
  private schemaWithAnnotationsProxy: StoreProxy<GraphQLSchema>;
  private baseDir: string;
  private log: Logger;
  private fetchFn: MeshFetch;
  private pubsub: HivePubSub;
  private importFn: ImportFn;

  constructor({
    name,
    config,
    baseDir,
    store,
    pubsub,
    log,
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
    this.log = log;
    this.importFn = importFn;
    if ('bundlePath' in config || 'bundleHeaders' in config) {
      throw new Error(
        `JSON Schema bundles are no longer available! You can directly use the generated SDL in \`source\` instead\nSee: https://the-guild.dev/graphql/mesh/docs/handlers/openapi#loading-the-sources-from-a-cdn-like-graphql-hive-or-schema-registry`,
      );
    }
  }

  async getNonExecutableSchema() {
    if (this.config.source) {
      this.log.info(`Fetching GraphQL Schema with annotations`);
      const sdl = await readFileOrUrl<string>(this.config.source, {
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
    return this.schemaWithAnnotationsProxy.getWithSet(() => {
      this.log.info(`Generating GraphQL schema from JSON Schemas`);
      return loadNonExecutableGraphQLSchemaFromJSONSchemas(this.name, {
        ...this.config,
        operations: this.config.operations as any,
        cwd: this.baseDir,
        fetch: this.fetchFn, log: this.log,
        pubsub: this.pubsub,
      });
    });
  }

  async getMeshSource({ fetchFn }: GetMeshSourcePayload): Promise<MeshSource> {
    this.fetchFn = fetchFn;
    this.log.debug('Getting the schema with annotations');
    const nonExecutableSchema = await this.getNonExecutableSchema();
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
