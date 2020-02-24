import { GraphQLSchema } from 'graphql';
import { SchemaTransformationFn, YamlConfig } from '@graphql-mesh/types';
import { SchemaComposer, ObjectTypeComposer } from 'graphql-compose';

export const linkTransform: SchemaTransformationFn<YamlConfig.Link> = async ({
  schema,
  config
}): Promise<GraphQLSchema> => {
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

export default linkTransform;
