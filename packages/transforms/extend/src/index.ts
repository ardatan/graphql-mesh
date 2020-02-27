import { GraphQLSchema, extendSchema, parse } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';

export const extendTransform: TransformFn<YamlConfig.Extend> = ({
  schema,
  config
}): GraphQLSchema => {
  return extendSchema(schema, parse(config.sdl));
};

export default extendTransform;
