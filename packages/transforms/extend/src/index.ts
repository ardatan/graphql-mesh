import { MeshTransform, MeshTransformOptions, YamlConfig , loadFromModuleExportExpressionSync } from '@graphql-mesh/utils';

import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadTypedefsSync } from '@graphql-tools/load';
import { mergeSchemas } from '@graphql-tools/merge';
import { GraphQLSchema } from 'graphql';

const asArray = <T>(maybeArray: T | T[]): T[] => {
  if (Array.isArray(maybeArray)) {
    return maybeArray;
  } else if (maybeArray) {
    return [maybeArray];
  } else {
    return [];
  }
};

export default class ExtendTransform implements MeshTransform {
  noWrap = true;
  private config: YamlConfig.ExtendTransform;
  constructor(options: MeshTransformOptions<YamlConfig.ExtendTransform>) {
    this.config = options.config;
  }

  transformSchema(schema: GraphQLSchema) {
    const sources = loadTypedefsSync(this.config.typeDefs, {
      cwd: process.cwd(),
      loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
    });
    const typeDefs = sources.map(source => source.document);
    const resolvers = asArray(this.config.resolvers).map(resolverDef => {
      if (typeof resolverDef === 'string') {
        return loadFromModuleExportExpressionSync(resolverDef);
      } else {
        return resolverDef;
      }
    });
    return mergeSchemas({
      schemas: [schema],
      typeDefs,
      resolvers,
    });
  }
}
