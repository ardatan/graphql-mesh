import { makeAugmentedSchema, inferSchema } from 'neo4j-graphql-js';
import neo4j, { Driver } from 'neo4j-driver';
import { YamlConfig, MeshHandler, GetMeshSourceOptions, MeshPubSub, Logger, KeyValueCache } from '@graphql-mesh/types';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import { readFileOrUrlWithCache } from '@graphql-mesh/utils';
import { env } from 'process';

export default class Neo4JHandler implements MeshHandler {
  private config: YamlConfig.Neo4JHandler;
  private baseDir: string;
  private pubsub: MeshPubSub;
  private typeDefs: StoreProxy<string>;
  private logger: Logger;
  private cache: KeyValueCache<string>;

  constructor({ config, baseDir, pubsub, store, logger, cache }: GetMeshSourceOptions<YamlConfig.Neo4JHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.pubsub = pubsub;
    this.typeDefs = store.proxy('typeDefs.graphql', PredefinedProxyOptions.StringWithoutValidation);
    this.logger = logger;
    this.cache = cache;
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
      this.pubsub.subscribe('destroy', () => this.driver.close());
    }
    return this.driver;
  }

  getCachedTypeDefs() {
    return this.typeDefs.getWithSet(async () => {
      if (this.config.typeDefs) {
        return readFileOrUrlWithCache(this.config.typeDefs, this.cache, {
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

    return {
      schema,
      contextBuilder: async () => ({ driver: this.getDriver(), neo4jDatabase: this.config.database }),
    };
  }
}
