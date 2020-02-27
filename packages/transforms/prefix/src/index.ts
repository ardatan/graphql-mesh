import { GraphQLSchema } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import { SchemaComposer } from 'graphql-compose';

export const prefixTransform: TransformFn<YamlConfig.Prefix> = async ({
  apiName,
  schema,
  config
}): Promise<GraphQLSchema> => {
  let prefix: string | null = null;

  if (config.prefix) {
    prefix = config.prefix;
  } else if (apiName) {
    prefix = `${apiName}_`;
  }

  if (!prefix) {
    throw new Error(`Transform 'prefix' has missing config: prefix`);
  }

  const composer = new SchemaComposer(schema);
  const excluded: string[] = [
    schema.getQueryType()?.name,
    schema.getMutationType()?.name,
    schema.getSubscriptionType()?.name,
    ...(config.ignore || [])
  ].filter(Boolean) as string[];
  const typeMap = schema.getTypeMap();

  for (const typeName of Object.keys(typeMap)) {
    if (!excluded.includes(typeName) && !typeName.startsWith('__')) {
      composer.get(typeName).setTypeName(`${prefix}${typeName}`);
    }
  }

  return composer.buildSchema();
};

export default prefixTransform;
