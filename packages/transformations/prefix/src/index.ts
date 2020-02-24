import { GraphQLSchema } from 'graphql';
import { SchemaTransformationFn, YamlConfig } from '@graphql-mesh/types';
import { SchemaComposer } from 'graphql-compose';

export const prefixTransform: SchemaTransformationFn<YamlConfig.Prefix> = async ({
  apiName,
  schema,
  config
}): Promise<GraphQLSchema> => {
  const composer = new SchemaComposer(schema);

  // TODO: Implement

  return composer.buildSchema();
};

export default prefixTransform;
