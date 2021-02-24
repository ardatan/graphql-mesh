import { isAbsolute } from 'path';
import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { loadFromModuleExportExpressionSync } from '@graphql-mesh/utils';
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
  private baseDir: string;

  constructor({ baseDir, config }: MeshTransformOptions<YamlConfig.ExtendTransform>) {
    this.config = config;
    this.baseDir = baseDir;
  }

  transformSchema(schema: GraphQLSchema) {
    const sources = loadTypedefsSync(this.config.typeDefs, {
      cwd: isAbsolute(this.config.typeDefs) ? null : this.baseDir,
      loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
    });
    const typeDefs = sources.map(source => source.document);
    const resolvers = asArray(this.config.resolvers).map(resolverDef => {
      if (typeof resolverDef === 'string') {
        return loadFromModuleExportExpressionSync(resolverDef, { cwd: this.baseDir });
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
