import { toGraphQLTypeDefs } from '@neo4j/introspector';
import { Neo4jGraphQL } from '@neo4j/graphql';
import neo4j, { Driver } from 'neo4j-driver';
import { YamlConfig, MeshHandler, GetMeshSourceOptions, MeshPubSub, Logger } from '@graphql-mesh/types';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import { readFileOrUrl } from '@graphql-mesh/utils';

export default class Neo4JHandler implements MeshHandler {
  private config: YamlConfig.Neo4JHandler;
  private baseDir: string;
  private pubsub: MeshPubSub;
  private typeDefs: StoreProxy<string>;
  private logger: Logger;

  constructor({ config, baseDir, pubsub, store, logger }: GetMeshSourceOptions<YamlConfig.Neo4JHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.pubsub = pubsub;
    this.typeDefs = store.proxy('typeDefs.graphql', PredefinedProxyOptions.StringWithoutValidation);
    this.logger = logger;
  }

  getCachedTypeDefs(driver: Driver) {
    return this.typeDefs.getWithSet(async () => {
      if (this.config.typeDefs) {
        return readFileOrUrl(this.config.typeDefs, {
          cwd: this.baseDir,
          allowUnknownExtensions: true,
          logger: this.logger,
        });
      } else {
        this.logger.info('Inferring the schema from the database: ', `"${this.config.database || 'neo4j'}"`);
        return toGraphQLTypeDefs(() =>
          driver.session({ database: this.config.database, defaultAccessMode: neo4j.session.READ })
        );
      }
    });
  }

  async getMeshSource() {
    const driver = neo4j.driver(this.config.url, neo4j.auth.basic(this.config.username, this.config.password), {
      useBigInt: true,
      logging: {
        logger: (level, message) => this.logger[level](message),
      },
    });

    this.pubsub
      .subscribe('destroy', () => {
        this.logger.debug(() => 'Closing Neo4j');
        driver
          .close()
          .then(() => {
            this.logger.debug(() => 'Neo4j has been closed');
          })
          .catch(error => {
            this.logger.debug(() => `Neo4j couldn't be closed: ${error.message}`);
          });
      })
      .catch(e => this.logger.error(e));

    const typeDefs = await this.getCachedTypeDefs(driver);

    const neo4jGraphQL = new Neo4jGraphQL({
      typeDefs,
      config: {
        driverConfig: {
          database: this.config.database,
        },
        enableDebug: !!process.env.DEBUG,
        skipValidateTypeDefs: true,
      },
      driver,
    });

    return {
      schema: await neo4jGraphQL.getSchema(),
    };
  }
}
