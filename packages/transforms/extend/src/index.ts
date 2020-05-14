import { GraphQLSchema, extendSchema, concatAST } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import { loadTypedefs } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';

const extendTransform: TransformFn<YamlConfig.Transform['extend']> = async ({
  schema,
  config,
}): Promise<GraphQLSchema> => {
  try {
    const sources = await loadTypedefs(config, {
      loaders: [new GraphQLFileLoader(), new CodeFileLoader()],
      assumeValid: true,
      assumeValidSDL: true,
    });
    const mergedDefinitions = concatAST(sources.map(source => source.document));
    return extendSchema(schema, mergedDefinitions);
  } catch (e) {
    throw new Error(`'extend' transform requires a valid SDL string!`);
  }
};

export default extendTransform;
