import { isAbsolute } from 'path';
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
  private config: YamlConfig.Neo4JHandler;
  private baseDir: string;
  private cache: KeyValueCache<any>;
  private pubsub: MeshPubSub;

  constructor({ name, config, baseDir, cache, pubsub }: GetMeshSourceOptions<YamlConfig.Neo4JHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
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
        cwd: isAbsolute(this.config.typeDefs) ? null : this.baseDir,
        loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
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

    const schema = makeAugmentedSchema({ typeDefs, config: { experimental: true } });

    return {
      schema,
      contextBuilder: async () => ({ driver: this.getDriver(), neo4jDatabase: this.config.database }),
    };
  }
}
