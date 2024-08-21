import type { GraphQLSchema } from 'graphql';
import { buildSchema } from 'graphql';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
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
import { dispose, isDisposable, readFileOrUrl } from '@graphql-mesh/utils';
import { getDriverFromOpts, getNeo4JExecutor, loadGraphQLSchemaFromNeo4J } from '@omnigraph/neo4j';

export default class Neo4JHandler implements MeshHandler {
  private config: YamlConfig.Neo4JHandler;
  private baseDir: string;
  private pubsub: MeshPubSub;
  private schema: StoreProxy<GraphQLSchema>;
  private logger: Logger;
  private name: string;
  fetchFn: MeshFetch;
  importFn: ImportFn;

  constructor({
    name,
    config,
    baseDir,
    pubsub,
    store,
    logger,
    importFn,
  }: MeshHandlerOptions<YamlConfig.Neo4JHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.pubsub = pubsub;
    this.schema = store.proxy('schema.graphql', PredefinedProxyOptions.GraphQLSchemaWithDiffing);
    this.logger = logger;
    this.importFn = importFn;
  }

  getCachedSchema(driver?: ReturnType<typeof getDriverFromOpts>) {
    return this.schema.getWithSet(async () => {
      if (this.config.source) {
        const typeDefs = await readFileOrUrl<string>(this.config.source, {
          cwd: this.baseDir,
          allowUnknownExtensions: true,
          importFn: this.importFn,
          fetch: this.fetchFn,
          logger: this.logger,
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
          },
          logger: this.logger,
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
        },
        logger: this.logger,
      });
    }

    const schema = await this.getCachedSchema(driver);

    const executor = await getNeo4JExecutor({
      schema,
      driver,
      pubsub: this.pubsub,
      logger: this.logger,
    });

    if (isDisposable(executor)) {
      const id = this.pubsub.subscribe('destroy', () => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        dispose(executor);
        this.pubsub.unsubscribe(id);
      });
    }

    return {
      schema,
      executor,
    };
  }
}
