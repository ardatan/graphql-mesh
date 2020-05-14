import { GraphQLSchema } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import { RenameTypes, RenameRootFields, wrapSchema } from '@graphql-tools/wrap';
import { Transform } from '@graphql-tools/utils';

const prefixTransform: TransformFn<YamlConfig.PrefixTransformConfig> = async ({
  apiName,
  schema,
  config,
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

  transforms.push(new RenameTypes(typeName => (ignoreList.includes(typeName) ? typeName : `${prefix}${typeName}`)));

  if (config.includeRootOperations) {
    transforms.push(
      new RenameRootFields((typeName, fieldName) =>
        ignoreList.includes(typeName) || ignoreList.includes(`${typeName}.${fieldName}`)
          ? fieldName
          : `${prefix}${fieldName}`
      )
    );
  }

  return wrapSchema({
    schema,
    transforms,
  });
};

export default prefixTransform;
