import { GraphQLSchema } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import { addResolversToSchema } from 'graphql-tools';
import { composeResolvers, extractResolversFromSchema, ResolversComposerMapping } from '@graphql-toolkit/common';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';

const resolversCompositionTransform: TransformFn<YamlConfig.ResolversCompositionTransformObject[]> = async ({
  schema,
  config,
}): Promise<GraphQLSchema> => {
  const resolversComposition: ResolversComposerMapping = {};

  for (const { resolver, composer } of config) {
    resolversComposition[resolver] = await loadFromModuleExportExpression(composer, 'default');
  }

  const resolvers = extractResolversFromSchema(schema);
  const composedResolvers = composeResolvers(resolvers, resolversComposition);

  addResolversToSchema({
    schema,
    resolvers: composedResolvers,
  });

  return schema;
};

export default resolversCompositionTransform;
