import { matcher } from 'micromatch';

import { GraphQLSchema } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import { Transform } from '@graphql-tools/utils';
import { FilterRootFields, FilterObjectFields, wrapSchema } from '@graphql-tools/wrap';

const filterSchemaTransform: TransformFn<YamlConfig.Transform['filterSchema']> = ({
  schema,
  config,
}): GraphQLSchema => {
  const rootTypes = [
    schema.getQueryType()?.name,
    schema.getMutationType()?.name,
    schema.getSubscriptionType()?.name,
  ].filter(Boolean) as string[];
  const transforms: Transform[] = [];
  for (const filter of config) {
    const [typeName, fieldGlob] = filter.split('.');
    const isMatch = matcher(fieldGlob.trim());
    if (rootTypes.includes(typeName)) {
      transforms.push(
        new FilterRootFields((rootTypeName, rootFieldName) => {
          if (rootTypeName === typeName) {
            return isMatch(rootFieldName);
          }
          return true;
        })
      );
    } else {
      transforms.push(
        new FilterObjectFields((objectTypeName, objectFieldName) => {
          if (objectTypeName === typeName) {
            return isMatch(objectFieldName);
          }
          return true;
        })
      );
    }
  }
  return wrapSchema({
    schema,
    transforms,
  });
};

export default filterSchemaTransform;
