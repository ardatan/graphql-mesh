import { GraphQLSchema, printSchema, Kind, buildSchema } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import {
  Transform,
  RenameTypes,
  RenameRootFields,
  transformSchema
} from 'graphql-tools-fork';

export const prefixTransform: TransformFn<YamlConfig.PrefixTransformConfig> = async ({
  apiName,
  schema,
  config
}): Promise<GraphQLSchema> => {
  let prefix: string | null = null;

  if (config.value) {
    prefix = config.value;
  } else if (apiName) {
    prefix = `${apiName}_`;
  }

  if (!prefix) {
    throw new Error(`Transform 'prefix' has missing config: prefix`);
  }

  const ignoreList = config.ignore || [];
  const transforms: Transform[] = [];

  transforms.push(
    new RenameTypes(typeName =>
      ignoreList.includes(typeName) ? typeName : `${prefix}${typeName}`
    )
  );

  if (config.includeRootOperations) {
    transforms.push(
      new RenameRootFields((typeName, fieldName) =>
        ignoreList.includes(typeName) ||
        ignoreList.includes(`${typeName}.${fieldName}`)
          ? fieldName
          : `${prefix}${fieldName}`
      )
    );
  }

  const transformedSchema = transformSchema(schema, transforms);
  for (const type of Object.values(transformedSchema.getTypeMap())) {
    type.astNode = null;
  }
  return transformedSchema;
};

export default prefixTransform;
