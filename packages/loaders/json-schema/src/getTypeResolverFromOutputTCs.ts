import { GraphQLError, GraphQLResolveInfo, GraphQLTypeResolver } from 'graphql';
import { ObjectTypeComposer } from 'graphql-compose';
import Ajv, { ValidateFunction, ErrorObject } from 'ajv';

export function getTypeResolverFromOutputTCs(
  ajv: Ajv,
  outputTypeComposers: ObjectTypeComposer[],
  statusCodeOneOfIndexMap?: Record<string, number>
): GraphQLTypeResolver<any, any> {
  return function resolveType(data: any, context: any, info: GraphQLResolveInfo) {
    if (data.__typename) {
      return data.__typename;
    } else if (data.resourceType) {
      return data.resourceType;
    }
    if (data.__response && statusCodeOneOfIndexMap) {
      const responseData: {
        status: number;
        url: string;
        statusText: string;
      } = data.__response;
      if (responseData.status in statusCodeOneOfIndexMap) {
        const oneOfIndex = statusCodeOneOfIndexMap[responseData.status];
        return outputTypeComposers[oneOfIndex].getTypeName();
      } else if (statusCodeOneOfIndexMap?.default) {
        return outputTypeComposers[statusCodeOneOfIndexMap.default].getTypeName();
      } else {
        return new GraphQLError(
          `HTTP Error: ${responseData.status}`,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          {
            ...responseData,
            responseJson: data,
          }
        );
      }
    }
    const validationErrors: Record<string, ErrorObject[]> = {};
    for (const outputTypeComposer of outputTypeComposers) {
      const validateFn = outputTypeComposer.getExtension('validateWithJSONSchema') as ValidateFunction;
      if (validateFn) {
        const isValid = validateFn(data);
        const typeName = outputTypeComposer.getTypeName();
        if (isValid) {
          return typeName;
        }
        validationErrors[typeName] = ajv.errors;
      }
    }
    return new GraphQLError(`Received data doesn't met the union`, null, null, null, null, null, {
      validationErrors,
    });
  };
}
