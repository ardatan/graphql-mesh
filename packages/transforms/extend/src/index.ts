import { isAbsolute } from 'path';
import { MeshTransform, MeshTransformOptions, SyncImportFn, YamlConfig } from '@graphql-mesh/types';
import { loadFromModuleExportExpressionSync } from '@graphql-mesh/utils';
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
  private syncImportFn: SyncImportFn;

  constructor({ baseDir, config, syncImportFn }: MeshTransformOptions<YamlConfig.ExtendTransform>) {
    this.config = config;
    this.baseDir = baseDir;
    this.syncImportFn = syncImportFn;
  }

  transformSchema(schema: GraphQLSchema) {
    const sources = loadTypedefsSync(this.config.typeDefs, {
      cwd: isAbsolute(this.config.typeDefs) ? null : this.baseDir,
      loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
    });
    const typeDefs = sources.map(source => source.document);
    const resolvers = asArray(this.config.resolvers).map(resolverDef => {
      if (typeof resolverDef === 'string') {
        return loadFromModuleExportExpressionSync(resolverDef, {
          cwd: this.baseDir,
          defaultExportName: 'default',
          syncImportFn: this.syncImportFn,
        });
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
