import { GraphQLInputType, isListType, isNonNullType, isInputObjectType } from 'graphql';
import { asArray } from '@graphql-tools/utils';
import { SchemaComposer } from 'graphql-compose';

export const resolveDataByUnionInputType = (data: any, type: GraphQLInputType, schemaComposer: SchemaComposer): any => {
  if (data) {
    if (isListType(type)) {
      return asArray(data).map(elem => resolveDataByUnionInputType(elem, type.ofType, schemaComposer));
    }
    if (isNonNullType(type)) {
      return resolveDataByUnionInputType(data, type.ofType, schemaComposer);
    }
    if (isInputObjectType(type)) {
      const fieldMap = type.getFields();
      const isOneOf = schemaComposer.getAnyTC(type).getDirectiveByName('oneOf');
      data = asArray(data)[0];
      for (const fieldName in data) {
        const field = fieldMap[fieldName];
        if (field) {
          if (isOneOf) {
            const resolvedData = resolveDataByUnionInputType(data[fieldName], field.type, schemaComposer);
            return resolvedData;
          }
          data[fieldName] = resolveDataByUnionInputType(data[fieldName], field.type, schemaComposer);
        }
      }
    }
  }
  return data;
};
