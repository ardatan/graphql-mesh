import { matcher } from 'micromatch';

import { GraphQLSchema, isObjectType } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';

const filterTransform: TransformFn<YamlConfig.Transform['filter']> = ({ schema, config }): GraphQLSchema => {
  for (const filter of config) {
    const [typeName, fieldGlob] = filter.split('.');
    const type = schema.getType(typeName);
    if (isObjectType(type)) {
      const isMatch = matcher(fieldGlob);
      const fieldMap = type.getFields();
      for (const fieldName in fieldMap) {
        if (!isMatch(fieldName)) {
          delete fieldMap[fieldName];
        }
      }
    }
  }
  return schema;
};

export default filterTransform;
