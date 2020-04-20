import { matcher } from 'micromatch';

import { GraphQLSchema, isObjectType } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';

const filterSchemaTransform: TransformFn<YamlConfig.Transform['filterSchema']> = ({
  schema,
  config,
}): GraphQLSchema => {
  for (const filter of config) {
    const [typeName, fieldGlob] = filter.split('.');
    const type = schema.getType(typeName);
    if (isObjectType(type)) {
      const isMatch = matcher(fieldGlob.trim());
      const fieldMap = type.getFields();
      for (const fieldName in fieldMap) {
        if (!isMatch(fieldName)) {
          delete fieldMap[fieldName];
        }
      }
      if (Object.values(fieldMap).filter(Boolean).length === 0) {
        throw new Error(`${typeName} type is now empty! Please fix your filter definitions!`);
      }
    }
  }
  return schema;
};

export default filterSchemaTransform;
