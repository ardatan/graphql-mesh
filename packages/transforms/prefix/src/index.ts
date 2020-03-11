import { GraphQLSchema } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import {
  Transform,
  RenameTypes,
  RenameRootFields,
  transformSchema
} from 'graphql-tools-fork';
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

  return transformSchema(schema, transforms);
};

export default prefixTransform;
