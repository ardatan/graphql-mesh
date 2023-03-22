import { GraphQLBigInt } from 'graphql-scalars';
import neo4j, { Driver } from 'neo4j-driver';
import { process } from '@graphql-mesh/cross-helpers';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import {
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
import { readFileOrUrl } from '@graphql-mesh/utils';
import { Neo4jGraphQL } from '@neo4j/graphql';
import { toGraphQLTypeDefs } from '@neo4j/introspector';

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
    setMaxListeners() {
      return this;
    },
  };
}

export default class Neo4JHandler implements MeshHandler {
  private config: YamlConfig.Neo4JHandler;
  private baseDir: string;
  private pubsub: MeshPubSub;
  private typeDefs: StoreProxy<string>;
  private logger: Logger;
  fetchFn: MeshFetch;
  importFn: ImportFn;

  constructor({
    config,
    baseDir,
    pubsub,
    store,
    logger,
    importFn,
  }: MeshHandlerOptions<YamlConfig.Neo4JHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.pubsub = pubsub;
    this.typeDefs = store.proxy('typeDefs.graphql', PredefinedProxyOptions.StringWithoutValidation);
    this.logger = logger;
    this.importFn = importFn;
  }

  getCachedTypeDefs(driver: Driver) {
    return this.typeDefs.getWithSet(async () => {
      if (this.config.source) {
        return readFileOrUrl(this.config.source, {
          cwd: this.baseDir,
          allowUnknownExtensions: true,
          importFn: this.importFn,
          fetch: this.fetchFn,
          logger: this.logger,
        });
      } else {
        this.logger.info(
          'Inferring the schema from the database: ',
          `"${this.config.database || 'neo4j'}"`,
        );
        let replaceAllPolyfilled = false;
        if (!String.prototype.replaceAll) {
          replaceAllPolyfilled = true;
          // eslint-disable-next-line no-extend-native
          String.prototype.replaceAll = function (str, newStr: any) {
            if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
              return this.replace(str, newStr);
            }
            return this.replace(new RegExp(str, 'g'), newStr);
          };
        }
        const typeDefs = await toGraphQLTypeDefs(() =>
          driver.session({ database: this.config.database, defaultAccessMode: neo4j.session.READ }),
        );
        if (replaceAllPolyfilled) {
          // eslint-disable-next-line no-extend-native
          delete String.prototype.replaceAll;
        }
        return typeDefs;
      }
    });
  }

  async getMeshSource({ fetchFn }: GetMeshSourcePayload): Promise<MeshSource> {
    this.fetchFn = fetchFn;
    const driver = neo4j.driver(
      this.config.endpoint,
      neo4j.auth.basic(this.config.username, this.config.password),
      {
        useBigInt: true,
        logging: {
          logger: (level, message) => this.logger[level](message),
        },
      },
    );

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
      resolvers: {
        BigInt: GraphQLBigInt,
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
