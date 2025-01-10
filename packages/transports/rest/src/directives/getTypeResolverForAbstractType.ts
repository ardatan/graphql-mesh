import {
  isAbstractType,
  type GraphQLObjectType,
  type GraphQLResolveInfo,
  type GraphQLTypeResolver,
} from 'graphql';
import { createGraphQLError, getDirective } from '@graphql-tools/utils';

export function getTypeResolverForAbstractType({
  possibleTypes,
  discriminatorField,
  discriminatorMapping,
  statusCodeTypeNameMap,
}: {
  possibleTypes: readonly GraphQLObjectType[];
  discriminatorField?: string;
  discriminatorMapping?: [string, string][];
  statusCodeTypeNameMap?: Record<string, string>;
}): GraphQLTypeResolver<any, any> {
  const discriminatorMappingObj = Array.isArray(discriminatorMapping)
    ? Object.fromEntries(discriminatorMapping)
    : discriminatorMapping;
  return function resolveType(data: any, _ctx: any, info: GraphQLResolveInfo) {
    if (data.__typename) {
      return data.__typename;
    } else if (discriminatorField != null && data[discriminatorField]) {
      const discriminatorValue = data[discriminatorField];
      return discriminatorMappingObj?.[discriminatorValue] || discriminatorValue;
    }
    if (data.$statusCode && statusCodeTypeNameMap) {
      const typeName =
        statusCodeTypeNameMap[data.$statusCode.toString()] || statusCodeTypeNameMap.default;
      if (typeName) {
        const type = info.schema.getType(typeName);
        if (isAbstractType(type)) {
          const typeName = type.resolveType(data, _ctx, info, type);
          if (typeName) {
            return typeName;
          }
        }
        return typeName;
      }
    }

    const dataTypeOf = typeof data;

    if (dataTypeOf !== 'object') {
      for (const possibleType of possibleTypes) {
        const fieldMap = possibleType.getFields();
        const fields = Object.values(fieldMap);
        if (fields.length === 1) {
          const field = fields[0];
          const directiveObjs = getDirective(info.schema, field, 'resolveRoot');
          if (directiveObjs?.length) {
            const fieldType = field.type;
            if ('parseValue' in fieldType) {
              try {
                fieldType.parseValue(data);
                return possibleType.name;
              } catch (e) {}
            }
          }
        }
      }
    }

    // const validationErrors: Record<string, ErrorObject[]> = {};
    const dataKeys = dataTypeOf
      ? Object.keys(data)
          // Remove metadata fields used to pass data
          .filter(property => !property.toString().startsWith('$'))
      : null;
    const scoreTypeNameMap = new Map<number, string>();
    for (const possibleType of possibleTypes) {
      const typeName = possibleType.name;
      if (dataKeys != null) {
        const typeFields = Object.keys(possibleType.getFields());
        if (
          dataKeys.length <= typeFields.length &&
          dataKeys.every(property => typeFields.includes(property.toString()))
        ) {
          return typeName;
        } else {
          const score = dataKeys.filter(property =>
            typeFields.includes(property.toString()),
          ).length;
          if (score || typeFields.includes('additionalProperties')) {
            scoreTypeNameMap.set(score, typeName);
          }
        }
      } /* else {
        const validateFn = possibleType.extensions.validateWithJSONSchema as ValidateFunction;
        if (validateFn) {
          const isValid = validateFn(data);
          if (isValid) {
            return typeName;
          }
          validationErrors[typeName] = ajv.errors || validateFn.errors;
        }
      } */
    }
    const maxScore = Math.max(...scoreTypeNameMap.keys());
    const typeName = scoreTypeNameMap.get(maxScore);
    if (typeName) {
      return typeName;
    }
    if (data.$response) {
      const error = createGraphQLError(`Upstream HTTP Error: ${data.$statusCode}`, {
        extensions: {
          code: 'DOWNSTREAM_SERVICE_ERROR',
          request: {
            url: data.$url,
            method: data.$method,
          },
          response: {
            status: data.$statusCode,
            statusText: data.$statusText,
            headers: data.$response.header,
            body: data.$response,
          },
        },
      });
      return error;
    }
    /*
    const error = new GraphQLError(`Received data doesn't met the union`, null, null, null, null, null, {
      validationErrors,
    });
    return error;
    */
  };
}
