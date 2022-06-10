import { toGraphQLTypeDefs } from '@neo4j/introspector';
import { Neo4jGraphQL } from '@neo4j/graphql';
import neo4j, { Driver } from 'neo4j-driver';
import { YamlConfig, MeshHandler, GetMeshSourceOptions, MeshPubSub, Logger } from '@graphql-mesh/types';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import { readFileOrUrl } from '@graphql-mesh/utils';
import { process } from '@graphql-mesh/cross-helpers';

function getEventEmitterFromPubSub(pubsub: MeshPubSub): any {
  return {
    on(event: string | symbol, listener: (...args: any[]) => void) {
      pubsub.subscribe(event.toString(), listener);
      return this;
    },
    once(event: string | symbol, listener: (...args: any[]) => void) {
      const id = pubsub.subscribe(event.toString(), data => {
        listener(data);
        pubsub.unsubscribe(id);
      });

      return this;
    },
    emit(event: string | symbol, ...args: any[]) {
      pubsub.publish(event.toString(), args[0]);
      return true;
    },
    addListener(event: string | symbol, listener: (...args: any[]) => void) {
      return this.on(event, listener);
    },
  };
}

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

    const id = this.pubsub.subscribe('destroy', async () => {
      this.pubsub.unsubscribe(id);
      this.logger.debug('Closing Neo4j');
      await driver.close();
      this.logger.debug('Neo4j closed');
    });

    const typeDefs = await this.getCachedTypeDefs(driver);

    const events = getEventEmitterFromPubSub(this.pubsub);
    const neo4jGraphQL = new Neo4jGraphQL({
      typeDefs,
      config: {
        driverConfig: {
          database: this.config.database,
        },
        enableDebug: !!process.env.DEBUG,
        skipValidateTypeDefs: true,
      },
      plugins: {
        subscriptions: {
          events,
          publish: eventMeta => this.pubsub.publish(eventMeta.event, eventMeta),
        },
      },
      driver,
    });

    return {
      schema: await neo4jGraphQL.getSchema(),
    };
  }
}
