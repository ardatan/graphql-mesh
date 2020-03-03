import {
  GraphQLSchema,
  printSchema,
  isUnionType,
  GraphQLObjectType
} from 'graphql';
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
    'String',
    'Int',
    'Float',
    'ID',
    'Boolean',
    schema.getQueryType()?.name,
    schema.getMutationType()?.name,
    schema.getSubscriptionType()?.name,
    ...(config.ignore || [])
  ].filter(Boolean) as string[];
  const typeMap = schema.getTypeMap();

  for (const [typeName, type] of Object.entries(typeMap)) {
    if (!excluded.includes(typeName) && !typeName.startsWith('__')) {
      composer.get(type).setTypeName(`${prefix}${typeName}`);
    }
  }

  if (config.includeRootOperations) {
    renameRootTypeFields(composer, schema.getQueryType(), prefix);
    renameRootTypeFields(composer, schema.getMutationType(), prefix);
    renameRootTypeFields(composer, schema.getSubscriptionType(), prefix);
  }

  return composer.buildSchema();
};

function renameRootTypeFields(
  composer: SchemaComposer<any>,
  type: GraphQLObjectType | null | undefined,
  prefix: string
) {
  if (type) {
    const typeTC = composer.getOTC(type);
    const allFields = typeTC.getFields();

    for (const [fieldName, field] of Object.entries(allFields)) {
      typeTC.removeField(fieldName);
      typeTC.setField(`${prefix}${fieldName}`, field);
    }
  }
}

export default prefixTransform;
