import { path as pathModule } from '@graphql-mesh/cross-helpers';
import { ImportFn, MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadTypedefsSync } from '@graphql-tools/load';
import { mergeSchemas } from '@graphql-tools/schema';
import { GraphQLSchema } from 'graphql';
import { asArray } from '@graphql-tools/utils';

export default class ExtendTransform implements MeshTransform {
  noWrap = true;
  private config: YamlConfig.ExtendTransform;
  private baseDir: string;
  private importFn: ImportFn;

  constructor({ baseDir, config, importFn }: MeshTransformOptions<YamlConfig.ExtendTransform>) {
    this.config = config;
    this.baseDir = baseDir;
    this.importFn = importFn;
  }

  transformSchema(schema: GraphQLSchema) {
    const sources = loadTypedefsSync(this.config.typeDefs, {
      cwd: pathModule.isAbsolute(this.config.typeDefs) ? null : this.baseDir,
      loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
    });
    const typeDefs = sources.map(source => source.document);
    const resolvers = asArray(this.config.resolvers).map(resolverDef => {
      if (typeof resolverDef === 'string') {
        const fn$ = loadFromModuleExportExpression<any>(resolverDef, {
          cwd: this.baseDir,
          defaultExportName: 'default',
          importFn: this.importFn,
        });
        return (...args: any[]) => fn$.then(fn => fn(...args));
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
