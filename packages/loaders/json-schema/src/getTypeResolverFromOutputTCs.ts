import { GraphQLError, GraphQLResolveInfo, GraphQLTypeResolver } from 'graphql';
import { ObjectTypeComposer, UnionTypeComposer } from 'graphql-compose';
import Ajv, { ValidateFunction, ErrorObject } from 'ajv';

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
    if (data.$statusCode && statusCodeOneOfIndexMap) {
      const type = statusCodeTypeMap.get(data.$statusCode.toString()) || statusCodeTypeMap.get('default');
      if (type) {
        if ('getFields' in type) {
          return type.getTypeName();
        } else {
          return type.getResolveType()(data, context, info, type.getType());
        }
      }
    }
    const validationErrors: Record<string, ErrorObject[]> = {};
    const dataKeys =
      typeof data === 'object'
        ? Object.keys(data)
            // Remove metadata fields used to pass data
            .filter(property => !property.toString().startsWith('$'))
        : null;
    const allOutputTypeComposers = outputTypeComposers.flatMap(typeComposer =>
      'getFields' in typeComposer ? typeComposer : typeComposer.getTypeComposers()
    );
    for (const outputTypeComposer of allOutputTypeComposers) {
      const typeName = outputTypeComposer.getTypeName();
      if (dataKeys != null) {
        const typeFields = outputTypeComposer.getFieldNames();
        if (
          dataKeys.length <= typeFields.length &&
          dataKeys.every(property => typeFields.includes(property.toString()))
        ) {
          return typeName;
        }
      } else {
        const validateFn = outputTypeComposer.getExtension('validateWithJSONSchema') as ValidateFunction;
        if (validateFn) {
          const isValid = validateFn(data);
          if (isValid) {
            return typeName;
          }
          validationErrors[typeName] = ajv.errors || validateFn.errors;
        }
      }
    }
    if (data.$response) {
      const error = new GraphQLError(
        `HTTP Error: ${data.$statusCode}`,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          $url: data.$url,
          $method: data.$method,
          $statusCode: data.$statusCode,
          $request: {
            query: data.$request.query,
            header: data.$request.header,
          },
          $response: {
            header: data.$response.header,
            body: data.$response.body,
          },
        }
      );
      return error;
    }
    const error = new GraphQLError(`Received data doesn't met the union`, null, null, null, null, null, {
      validationErrors,
    });
    return error;
  };
}
