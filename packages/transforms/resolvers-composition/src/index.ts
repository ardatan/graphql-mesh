import { GraphQLSchema } from 'graphql';
import { YamlConfig, MeshTransformOptions, MeshTransform , extractResolvers, loadFromModuleExportExpressionSync } from '@graphql-mesh/utils';
import { addResolversToSchema } from '@graphql-tools/schema';
import { composeResolvers, ResolversComposerMapping } from '@graphql-tools/resolvers-composition';


export default class ResolversCompositionTransform implements MeshTransform {
  public noWrap = true;
  constructor(private options: MeshTransformOptions<YamlConfig.ResolversCompositionTransformObject[]>) {}
  transformSchema(schema: GraphQLSchema) {
    const resolversComposition: ResolversComposerMapping = {};

    for (const { resolver, composer } of this.options.config) {
      resolversComposition[resolver] = loadFromModuleExportExpressionSync(composer, 'default'); // Async is not available
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
