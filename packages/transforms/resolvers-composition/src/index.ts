import { GraphQLSchema } from 'graphql';
import { YamlConfig, MeshTransformOptions, Transform } from '@graphql-mesh/types';
import { addResolversToSchema } from '@graphql-tools/schema';
import { composeResolvers, ResolversComposerMapping } from '@graphql-tools/resolvers-composition';
import { extractResolvers, loadFromModuleExportExpressionSync } from '@graphql-mesh/utils';

export default class ResolversCompositionTransform implements Transform {
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
