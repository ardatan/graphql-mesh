import { GraphQLSchema, extendSchema, parse } from 'graphql';
import { SchemaTransformationFn, YamlConfig } from '@graphql-mesh/types';

export const extendTransform: SchemaTransformationFn<YamlConfig.Extend> = async ({
  schema,
  config
}): Promise<GraphQLSchema> => {
  return extendSchema(schema, parse(config.sdl));
};

export default extendTransform;
