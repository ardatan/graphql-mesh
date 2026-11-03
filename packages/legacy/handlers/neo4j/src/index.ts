import type { GraphQLSchema } from 'graphql';
import { buildSchema } from 'graphql';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import type { GetMeshSourcePayload, ImportFn, MeshFetch, MeshHandler, MeshHandlerOptions, HivePubSub, MeshSource, YamlConfig } from '@graphql-mesh/types';
import { dispose, isDisposable, readFileOrUrl } from '@graphql-mesh/utils';
import { getDriverFromOpts, getNeo4JExecutor, loadGraphQLSchemaFromNeo4J } from '@omnigraph/neo4j';
import { Logger } from '@graphql-hive/logger';

export default class Neo4JHandler implements MeshHandler {
  private config: YamlConfig.Neo4JHandler;
  private baseDir: string;
  private pubsub: HivePubSub;
  private disposables?: AsyncDisposableStack;
  private schema: StoreProxy<GraphQLSchema>;
  private log: Logger;
  private name: string;
  fetchFn: MeshFetch;
  importFn: ImportFn;

  constructor({
    name,
    config,
    baseDir,
    pubsub,
    disposables,
    store,
    log,
    importFn,
  }: MeshHandlerOptions<YamlConfig.Neo4JHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.pubsub = pubsub;
    this.disposables = disposables;
    this.schema = store.proxy('schema.graphql', PredefinedProxyOptions.GraphQLSchemaWithDiffing);
    this.log = log;
    this.importFn = importFn;
  }

  getCachedSchema(driver?: ReturnType<typeof getDriverFromOpts>) {
    return this.schema.getWithSet(async () => {
      if (this.config.source) {
        const typeDefs = await readFileOrUrl<string>(this.config.source, {
          cwd: this.baseDir,
          allowUnknownExtensions: true,
          importFn: this.importFn,
          fetch: this.fetchFn, log: this.log,
        });
        return buildSchema(typeDefs, {
          noLocation: true,
          assumeValid: true,
          assumeValidSDL: true,
        });
      } else {
        return loadGraphQLSchemaFromNeo4J(this.name, {
          driver,
          endpoint: this.config.endpoint,
          auth: {
            type: 'basic',
            username: this.config.username,
            password: this.config.password,
          }, log: this.log,
          pubsub: this.pubsub,
          database: this.config.database,
        });
      }
    });
  }

  async getMeshSource({ fetchFn }: GetMeshSourcePayload): Promise<MeshSource> {
    this.fetchFn = fetchFn;

    let driver: ReturnType<typeof getDriverFromOpts>;

    if (this.config.endpoint) {
      driver = getDriverFromOpts({
        endpoint: this.config.endpoint,
        auth: {
          type: 'basic',
          username: this.config.username,
          password: this.config.password,
        }, log: this.log,
      });
    }

    const schema = await this.getCachedSchema(driver);

    const executor = await getNeo4JExecutor({
      schema,
      driver,
      pubsub: this.pubsub, log: this.log,
    });

    if (isDisposable(executor)) {
      this.disposables?.defer(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        dispose(executor);
      });
    }

    return {
      schema,
      executor,
    };
  }
}
