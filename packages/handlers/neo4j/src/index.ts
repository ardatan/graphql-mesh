import { isAbsolute } from 'path';
import { makeAugmentedSchema, inferSchema } from 'neo4j-graphql-js';
import neo4j, { Driver } from 'neo4j-driver';
import { YamlConfig, MeshHandler, GetMeshSourceOptions, MeshPubSub } from '@graphql-mesh/types';
import { loadSchema } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { buildASTSchema, GraphQLSchema, parse } from 'graphql';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import { getDocumentNodeFromSchema } from '@graphql-tools/utils';

export default class Neo4JHandler implements MeshHandler {
  private config: YamlConfig.Neo4JHandler;
  private baseDir: string;
  private pubsub: MeshPubSub;
  private inferredSchema: StoreProxy<GraphQLSchema>;

  constructor({ config, baseDir, pubsub, store }: GetMeshSourceOptions<YamlConfig.Neo4JHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.pubsub = pubsub;
    this.inferredSchema = store.proxy('inferredSchema.graphql', PredefinedProxyOptions.GraphQLSchemaWithDiffing);
  }

  private driver: Driver;

  getDriver() {
    if (!this.driver) {
      this.driver = neo4j.driver(this.config.url, neo4j.auth.basic(this.config.username, this.config.password));
      this.pubsub.subscribe('destroy', () => this.driver.close());
    }
    return this.driver;
  }

  getCachedTypeDefs() {
    return this.inferredSchema.getWithSet(async () => {
      if (this.config.typeDefs) {
        return loadSchema(this.config.typeDefs, {
          cwd: isAbsolute(this.config.typeDefs) ? null : this.baseDir,
          loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
          assumeValid: true,
          assumeValidSDL: true,
        });
      } else {
        let typeDefs = await inferSchema(this.getDriver(), {
          alwaysIncludeRelationships: this.config.alwaysIncludeRelationships,
        });
        if (typeof typeDefs === 'string') {
          typeDefs = parse(typeDefs);
        }
        return buildASTSchema(typeDefs);
      }
    });
  }

  async getMeshSource() {
    const inferredSchema = await this.getCachedTypeDefs();
    const typeDefs = getDocumentNodeFromSchema(inferredSchema);

    const schema = makeAugmentedSchema({ typeDefs, config: { experimental: true } });

    return {
      schema,
      contextBuilder: async () => ({ driver: this.getDriver(), neo4jDatabase: this.config.database }),
    };
  }
}
