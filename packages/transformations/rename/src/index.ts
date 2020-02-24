import { GraphQLSchema } from 'graphql';
import { SchemaTransformationFn, YamlConfig } from '@graphql-mesh/types';
import { SchemaComposer } from 'graphql-compose';

export const renameTransform: SchemaTransformationFn<YamlConfig.Rename> = async ({
  schema,
  config
}): Promise<GraphQLSchema> => {
  const composer = new SchemaComposer(schema);
  composer.get(config.from).setTypeName(config.to);

  return composer.buildSchema();
};

export default renameTransform;
