import { makeAugmentedSchema, inferSchema } from 'neo4j-graphql-js';
import neo4j, { Driver } from 'neo4j-driver';
import { YamlConfig, MeshHandler, GetMeshSourceOptions, MeshPubSub, Logger } from '@graphql-mesh/types';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import { jitExecutorFactory, readFileOrUrl } from '@graphql-mesh/utils';
import { env } from 'process';
import { ExecutionRequest } from '@graphql-tools/utils';
import { ExecutionResult } from 'graphql';

export default class Neo4JHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.Neo4JHandler;
  private baseDir: string;
  private pubsub: MeshPubSub;
  private typeDefs: StoreProxy<string>;
  private logger: Logger;

  constructor({ name, config, baseDir, pubsub, store, logger }: GetMeshSourceOptions<YamlConfig.Neo4JHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.pubsub = pubsub;
    this.typeDefs = store.proxy('typeDefs.graphql', PredefinedProxyOptions.StringWithoutValidation);
    this.logger = logger;
  }

  private driver: Driver;

  getDriver() {
    if (!this.driver) {
      this.driver = neo4j.driver(this.config.url, neo4j.auth.basic(this.config.username, this.config.password), {
        useBigInt: true,
        logging: {
          logger: (level, message) => this.logger[level](message),
        },
      });
      this.pubsub
        .subscribe('destroy', () => {
          this.logger.debug(() => 'Closing Neo4j');
          this.driver
            .close()
            .then(() => {
              this.logger.debug(() => 'Neo4j has been closed');
            })
            .catch(error => {
              this.logger.debug(() => `Neo4j couldn't be closed: ${error.message}`);
            });
        })
        .catch(e => this.logger.error(e));
    }
    return this.driver;
  }

  getCachedTypeDefs() {
    return this.typeDefs.getWithSet(async () => {
      if (this.config.typeDefs) {
        return readFileOrUrl(this.config.typeDefs, {
          cwd: this.baseDir,
          allowUnknownExtensions: true,
        });
      } else {
        const { typeDefs } = await inferSchema(this.getDriver(), {
          alwaysIncludeRelationships: this.config.alwaysIncludeRelationships,
        });
        return typeDefs;
      }
    });
  }

  async getMeshSource() {
    const typeDefs = await this.getCachedTypeDefs();

    const schema = makeAugmentedSchema({
      typeDefs,
      config: {
        experimental: true,
        debug: !!env.DEBUG,
      },
      logger: this.logger,
    });

    const jitExecutor = jitExecutorFactory(schema, this.name, this.logger);
    const driverGetter = () => this.getDriver();
    const neo4jContext = {
      get driver() {
        return driverGetter();
      },
      neo4jDatabase: this.config.database,
    };

    return {
      schema,
      executor: <TResult>(executionRequest: ExecutionRequest) => {
        return jitExecutor({
          ...executionRequest,
          context: {
            ...executionRequest.context,
            ...neo4jContext,
          },
        }) as ExecutionResult<TResult>;
      },
    };
  }
}
