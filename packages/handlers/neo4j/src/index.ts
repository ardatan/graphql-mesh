import { makeAugmentedSchema, inferSchema } from 'neo4j-graphql-js';
import neo4j, { Driver } from 'neo4j-driver';
import { YamlConfig, MeshHandler, GetMeshSourceOptions, KeyValueCache, MeshPubSub } from '@graphql-mesh/types';
import { loadTypedefs } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { DocumentNode } from 'graphql';

export default class Neo4JHandler implements MeshHandler {
  private name: string;
  private cache: KeyValueCache<any>;
  private config: YamlConfig.Neo4JHandler;
  private pubsub: MeshPubSub;

  constructor({ name, cache, config, pubsub }: GetMeshSourceOptions<YamlConfig.Neo4JHandler>) {
    this.name = name;
    this.cache = cache;
    this.config = config;
    this.pubsub = pubsub;
  }

  private driver: Driver;

  getDriver() {
    if (!this.driver) {
      this.driver = neo4j.driver(this.config.url, neo4j.auth.basic(this.config.username, this.config.password));
      this.pubsub.subscribe('destroy', () => this.driver.close());
    }
    return this.driver;
  }

  async getMeshSource() {
    let typeDefs: DocumentNode | string;

    const cacheKey = this.name + '_introspection';

    if (this.config.typeDefs) {
      const typeDefsArr = await loadTypedefs(this.config.typeDefs, {
        loaders: [new GraphQLFileLoader(), new CodeFileLoader()],
        assumeValid: true,
        assumeValidSDL: true,
      });
      typeDefs = mergeTypeDefs(typeDefsArr.map(source => source.document));
    } else {
      if (this.config.cacheIntrospection) {
        typeDefs = await this.cache.get(cacheKey);
      }

      if (!typeDefs) {
        const inferredSchema = await inferSchema(this.getDriver(), {
          alwaysIncludeRelationships: this.config.alwaysIncludeRelationships,
        });
        typeDefs = inferredSchema.typeDefs;

        if (this.config.cacheIntrospection) {
          await this.cache.set(cacheKey, typeDefs, {
            ttl: typeof this.config.cacheIntrospection === 'object' && this.config.cacheIntrospection.ttl,
          });
        }
      }
    }

    const schema = makeAugmentedSchema({ typeDefs });

    return {
      schema,
      contextBuilder: async () => ({ driver: this.getDriver(), neo4jDatabase: this.config.database }),
    };
  }
}
