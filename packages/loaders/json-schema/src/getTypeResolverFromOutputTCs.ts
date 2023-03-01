import { GraphQLFieldMap, GraphQLObjectType, GraphQLTypeResolver, isNonNullType } from 'graphql';
import { createGraphQLError } from '@graphql-tools/utils';

function calculateScore(
  dataKeys: (string | number | symbol)[],
  typeFields: GraphQLFieldMap<any, any>,
) {
  const requiredFields: string[] = [];
  const optionalFields: string[] = [];
  Object.entries(typeFields).forEach(([name, type]) => {
    if (isNonNullType(type.type)) {
      requiredFields.push(name);
    } else {
      optionalFields.push(name);
    }
  });

  let requiredCount = 0;
  let optionalCount = 0;
  for (const dataKey of dataKeys) {
    if (requiredFields.includes(dataKey.toString())) {
      requiredCount++;
    } else if (optionalFields.includes(dataKey.toString())) {
      optionalCount++;
    } else {
      optionalCount--;
    }
  }

  const requiredScore =
    requiredFields.length > 0 ? Math.round((requiredCount / requiredFields.length) * 100) : 0;
  const optionalScore =
    optionalFields.length > 0 ? Math.round((optionalCount / optionalFields.length) * 100) : 0;
  return { requiredScore, optionalScore };
}

export function getTypeResolverFromOutputTCs(
  possibleTypes: readonly GraphQLObjectType[],
  discriminatorField?: string,
  statusCodeTypeNameMap?: Record<string, string>,
): GraphQLTypeResolver<any, any> {
  return function resolveType(data: any) {
    if (data.__typename) {
      return data.__typename;
    } else if (discriminatorField != null && data[discriminatorField]) {
      return data[discriminatorField];
    }
    if (data.$statusCode && statusCodeTypeNameMap) {
      const typeName =
        statusCodeTypeNameMap[data.$statusCode.toString()] || statusCodeTypeNameMap.default;
      if (typeName) {
        return typeName;
      }
    }
    // const validationErrors: Record<string, ErrorObject[]> = {};
    const dataKeys =
      typeof data === 'object'
        ? Object.keys(data)
            // Remove metadata fields used to pass data
            .filter(property => !property.toString().startsWith('$'))
        : null;
    let typeNameWithHighestScore: string;
    let highestRequiredScore = -Infinity;
    let highestOptionalScore = -Infinity;
    for (const possibleType of possibleTypes) {
      const typeName = possibleType.name;
      if (dataKeys != null) {
        const score = calculateScore(dataKeys, possibleType.getFields());
        if (score.requiredScore === 100 && score.optionalScore === 100) {
          return typeName;
        }
        if (score.requiredScore > highestRequiredScore) {
          highestRequiredScore = score.requiredScore;
          highestOptionalScore = score.optionalScore;
          typeNameWithHighestScore = typeName;
        } else if (
          score.requiredScore === highestRequiredScore &&
          score.optionalScore > highestOptionalScore
        ) {
          highestOptionalScore = score.optionalScore;
          typeNameWithHighestScore = typeName;
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
    if (typeNameWithHighestScore) {
      return typeNameWithHighestScore;
    }
    if (data.$response) {
      const error = createGraphQLError(`HTTP Error: ${data.$statusCode}`, {
        extensions: {
          http: {
            status: data.$statusCode,
            headers: data.$response.header,
          },
          request: {
            url: data.$url,
            method: data.$method,
          },
          responseJson: data.$response,
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
