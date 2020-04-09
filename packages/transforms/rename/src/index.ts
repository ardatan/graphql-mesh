import { GraphQLSchema } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import {
  Transform,
  RenameTypes,
  RenameObjectFields,
  RenameRootFields,
  RenameRootTypes,
  transformSchema,
} from 'graphql-tools-fork';

const renameTransform: TransformFn<YamlConfig.RenameTransformObject[]> = async ({
  schema,
  config,
}): Promise<GraphQLSchema> => {
  const rootTypes = [
    schema.getQueryType()?.name,
    schema.getMutationType()?.name,
    schema.getSubscriptionType()?.name,
  ].filter(Boolean) as string[];
  const transforms: Transform[] = [];

  for (const change of config) {
    const [fromTypeName, fromFieldName] = change.from.split('.');
    const [toTypeName, toFieldName] = change.to.split('.');
    const isRootType = rootTypes.includes(fromTypeName);

    if (fromTypeName !== toTypeName) {
      if (isRootType) {
        transforms.push(new RenameRootTypes(t => (t === fromTypeName ? toTypeName : t)));
      } else {
        transforms.push(new RenameTypes(t => (t === fromTypeName ? toTypeName : t)));
      }
    }

    if (fromFieldName && toFieldName && fromFieldName !== toFieldName) {
      if (isRootType) {
        transforms.push(
          new RenameRootFields((typeName, fieldName) =>
            typeName === toTypeName && fieldName === fromFieldName ? toFieldName : fieldName
          )
        );
      } else {
        transforms.push(
          new RenameObjectFields((typeName, fieldName) =>
            typeName === toTypeName && fieldName === fromFieldName ? toFieldName : fieldName
          )
        );
      }
    }
  }

  const transformedSchema = transformSchema(schema, transforms);
  return transformedSchema;
};

export default renameTransform;
