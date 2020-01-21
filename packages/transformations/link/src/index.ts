import { GraphQLSchema } from 'graphql';
import { SchemaTransformationFn } from '@graphql-mesh/types';
import { SchemaComposer, ObjectTypeComposer } from 'graphql-compose';

export const prefixTransform: SchemaTransformationFn<{
  from: string;
  to: string;
  type: 'link';
}> = async ({ apiName, schema, config }): Promise<GraphQLSchema> => {
  const composer = new SchemaComposer(schema);
  const [fromTypeName, newFieldName] = config.from.split('.');
  const toTypeName = config.to;

  const fromTypeComposer = composer.get(fromTypeName);

  if (fromTypeComposer instanceof ObjectTypeComposer) {
    fromTypeComposer.addFields({
      [newFieldName]: toTypeName
    });
  }

  return composer.buildSchema();
};

export default prefixTransform;
