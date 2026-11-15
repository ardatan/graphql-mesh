import type { GraphQLInputType, GraphQLSchema } from 'graphql';
import { isInputObjectType, isListType, isNonNullType } from 'graphql';
import { sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { asArray, getDirective } from '@graphql-tools/utils';

export function resolveDataByUnionInputType(
  data: any,
  type: GraphQLInputType,
  schema: GraphQLSchema,
): any {
  if (data) {
    if (isListType(type)) {
      return asArray(data).map(elem => resolveDataByUnionInputType(elem, type.ofType, schema));
    }
    if (isNonNullType(type)) {
      return resolveDataByUnionInputType(data, type.ofType, schema);
    }
    if (isInputObjectType(type)) {
      const typeOneOfDirectives = getDirective(schema, type, 'oneOf');
      const isOneOf = typeOneOfDirectives?.length;
      const fieldMap = type.getFields();
      data = asArray(data)[0];
      for (const propertyName in data) {
        const fieldName = sanitizeNameForGraphQL(propertyName);
        const field = fieldMap[fieldName];
        if (field) {
          if (isOneOf) {
            const resolvedData = resolveDataByUnionInputType(data[fieldName], field.type, schema);
            return resolvedData;
          }
          const fieldData = data[fieldName];
          data[fieldName] = undefined;
          const fieldResolveRootFieldDirectives = getDirective(schema, field, 'resolveRootField');
          const realFieldName = fieldResolveRootFieldDirectives?.[0]?.field || fieldName;
          data[realFieldName] = resolveDataByUnionInputType(fieldData, field.type, schema);
        }
      }
    }
  }
  return data;
}
