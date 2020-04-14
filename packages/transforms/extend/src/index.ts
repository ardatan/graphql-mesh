import { GraphQLSchema, extendSchema, parse } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';

const extendTransform: TransformFn<YamlConfig.Transform['extend']> = ({ schema, config }): GraphQLSchema => {
  if (!config) {
    throw new Error(`'extend' transform requires a valid SDL string!`);
  }

  return extendSchema(schema, parse(config));
};

export default extendTransform;
