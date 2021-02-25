import { GraphQLSchema } from 'graphql';
import { YamlConfig, MeshTransformOptions, MeshTransform } from '@graphql-mesh/types';
import { addResolversToSchema } from '@graphql-tools/schema';
import { composeResolvers, ResolversComposerMapping } from '@graphql-tools/resolvers-composition';
import { extractResolvers, loadFromModuleExportExpressionSync } from '@graphql-mesh/utils';

export default class ResolversCompositionTransform implements MeshTransform {
  public noWrap = true;
  private config: YamlConfig.Transform['resolversComposition'];
  private baseDir: string;

  constructor({ baseDir, config }: MeshTransformOptions<YamlConfig.Transform['resolversComposition']>) {
    this.config = config;
    this.baseDir = baseDir;
  }

  transformSchema(schema: GraphQLSchema) {
    const resolversComposition: ResolversComposerMapping = {};

    for (const { resolver, composer } of this.config) {
      resolversComposition[resolver] = loadFromModuleExportExpressionSync(composer, {
        defaultExportName: 'default',
        cwd: this.baseDir,
      }); // Async is not available
    }

    const resolvers = extractResolvers(schema);
    const composedResolvers = composeResolvers(resolvers, resolversComposition);

    return addResolversToSchema({
      schema,
      resolvers: composedResolvers,
      updateResolversInPlace: true,
    });
  }
}

export { ResolversComposition } from '@graphql-tools/resolvers-composition';
