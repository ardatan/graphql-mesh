import { path, path as pathModule } from '@graphql-mesh/cross-helpers';
import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadTypedefsSync } from '@graphql-tools/load';
import { mergeSchemas } from '@graphql-tools/schema';
import { GraphQLSchema } from 'graphql';
import { asArray } from '@graphql-tools/utils';

function loadFromModuleExportExpressionSync<T>({
  expression,
  defaultExportName,
  cwd,
}: {
  expression: T | string;
  defaultExportName: string;
  cwd: string;
}): T {
  if (typeof expression !== 'string') {
    return expression;
  }

  const [modulePath, exportName = defaultExportName] = expression.split('#');
  const mod = tryRequire(modulePath, cwd);
  return mod[exportName] || (mod.default && mod.default[exportName]) || mod.default || mod;
}

function tryRequire(modulePath: string, cwd: string) {
  try {
    return require(modulePath);
  } catch {
    if (!path.isAbsolute(modulePath)) {
      const absoluteModulePath = path.isAbsolute(modulePath) ? modulePath : path.join(cwd, modulePath);
      return require(absoluteModulePath);
    }
  }
}

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
      cwd: pathModule.isAbsolute(this.config.typeDefs) ? null : this.baseDir,
      loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
    });
    const typeDefs = sources.map(source => source.document);
    const resolvers = asArray(this.config.resolvers).map(resolverDef => {
      if (typeof resolverDef === 'string') {
        return loadFromModuleExportExpressionSync({
          expression: resolverDef,
          defaultExportName: 'default',
          cwd: this.baseDir,
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
