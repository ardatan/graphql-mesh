import { GraphQLSchema } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import { SchemaComposer } from 'graphql-compose';

export const renameTransform: TransformFn<YamlConfig.Rename> = ({
  schema,
  config
}): GraphQLSchema => {
  const composer = new SchemaComposer(schema);
  composer.get(config.from).setTypeName(config.to);

  return composer.buildSchema();
};

export default renameTransform;
