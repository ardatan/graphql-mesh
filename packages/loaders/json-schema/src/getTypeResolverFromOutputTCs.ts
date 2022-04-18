import { GraphQLError, GraphQLResolveInfo, GraphQLTypeResolver } from 'graphql';
import { ObjectTypeComposer, UnionTypeComposer } from 'graphql-compose';
import Ajv, { ValidateFunction, ErrorObject } from 'ajv';

interface ResponseData {
  status: number;
  url: string;
  statusText: string;
}

export function getTypeResolverFromOutputTCs(
  ajv: Ajv,
  outputTypeComposers: (ObjectTypeComposer | UnionTypeComposer)[],
  statusCodeOneOfIndexMap?: Record<string, number>
): GraphQLTypeResolver<any, any> {
  const statusCodeTypeMap = new Map<string, ObjectTypeComposer | UnionTypeComposer>();
  for (const statusCode in statusCodeOneOfIndexMap) {
    statusCodeTypeMap.set(statusCode.toString(), outputTypeComposers[statusCodeOneOfIndexMap[statusCode]]);
  }
  return function resolveType(data: any, context: any, info: GraphQLResolveInfo) {
    if (data.__typename) {
      return data.__typename;
    } else if (data.resourceType) {
      return data.resourceType;
    }
    if (data.$response && statusCodeOneOfIndexMap) {
      const responseData: ResponseData = data.$response;
      const type = statusCodeTypeMap.get(responseData.status.toString()) || statusCodeTypeMap.get('default');
      if (type) {
        if ('getFields' in type) {
          return type.getTypeName();
        } else {
          return type.getResolveType()(data, context, info, type.getType());
        }
      }
    }
    const validationErrors: Record<string, ErrorObject[]> = {};
    for (const outputTypeComposer of outputTypeComposers) {
      const validateFn = outputTypeComposer.getExtension('validateWithJSONSchema') as ValidateFunction;
      if (validateFn) {
        const isValid = validateFn(data);
        const typeName = outputTypeComposer.getTypeName();
        if (isValid) {
          if ('getFields' in outputTypeComposer) {
            return outputTypeComposer.getTypeName();
          } else {
            return outputTypeComposer.getResolveType()(data, context, info, outputTypeComposer.getType());
          }
        }
        validationErrors[typeName] = ajv.errors || validateFn.errors;
      }
    }
    if (data.$response) {
      const responseData: ResponseData = data.$response;
      const error = new GraphQLError(
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
      console.error(error);
      return error;
    }
    const error = new GraphQLError(`Received data doesn't met the union`, null, null, null, null, null, {
      validationErrors,
    });
    console.error(error);
    return error;
  };
}
