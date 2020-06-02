import { GraphQLSchema } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import { addResolversToSchema } from '@graphql-tools/schema';
import { composeResolvers, ResolversComposerMapping } from '@graphql-tools/resolvers-composition';
import { extractResolvers, loadFromModuleExportExpression } from '@graphql-mesh/utils';

const resolversCompositionTransform: TransformFn<YamlConfig.ResolversCompositionTransformObject[]> = async ({
  schema,
  config,
}): Promise<GraphQLSchema> => {
  const resolversComposition: ResolversComposerMapping = {};

  for (const { resolver, composer } of config) {
    resolversComposition[resolver] = await loadFromModuleExportExpression(composer, 'default');
  }

  const resolvers = extractResolvers(schema);
  const composedResolvers = composeResolvers(resolvers, resolversComposition);

  return addResolversToSchema({
    schema,
    resolvers: composedResolvers,
    updateResolversInPlace: true,
  });
};

export default resolversCompositionTransform;
