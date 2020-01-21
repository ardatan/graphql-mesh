import { GraphQLSchema } from 'graphql';
import { SchemaTransformationFn } from '@graphql-mesh/types';
import { SchemaComposer } from 'graphql-compose';

export const prefixTransform: SchemaTransformationFn<{
  prefix?: string;
  type: 'prefix';
}> = async ({ apiName, schema, config }): Promise<GraphQLSchema> => {
  const composer = new SchemaComposer(schema);

  // TODO: Implement

  return composer.buildSchema();
};

export default prefixTransform;
