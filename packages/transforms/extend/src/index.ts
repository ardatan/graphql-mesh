import { GraphQLSchema } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import { loadTypedefs } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { mergeSchemasAsync } from '@graphql-tools/merge';

const extendTransform: TransformFn<YamlConfig.Transform['extend']> = async ({
  schema,
  config,
}): Promise<GraphQLSchema> => {
  const sources = await loadTypedefs(config, {
    loaders: [new GraphQLFileLoader(), new CodeFileLoader()],
    assumeValid: true,
    assumeValidSDL: true,
  });
  return mergeSchemasAsync({
    schemas: [schema],
    typeDefs: sources.map(source => source.document),
  });
};

export default extendTransform;
