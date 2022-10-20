import { GraphQLError, GraphQLResolveInfo, GraphQLTypeResolver } from 'graphql';
import { ObjectTypeComposer, UnionTypeComposer } from 'graphql-compose';
import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import { JSONSchemaObject } from 'json-machete';
import { TypeComposers } from './getComposerFromJSONSchema';
import { createGraphQLError } from '@graphql-tools/utils';

export function getTypeResolverFromOutputTCs(
  ajv: Ajv,
  outputTypeComposers: (ObjectTypeComposer | UnionTypeComposer)[],
  subSchemaAndTypeComposers: JSONSchemaObject & TypeComposers,
  statusCodeOneOfIndexMap?: Record<string, number>
): GraphQLTypeResolver<any, any> {
  const statusCodeTypeMap = new Map<string, ObjectTypeComposer | UnionTypeComposer>();
  for (const statusCode in statusCodeOneOfIndexMap) {
    statusCodeTypeMap.set(statusCode.toString(), outputTypeComposers[statusCodeOneOfIndexMap[statusCode]]);
  }
  const discriminatorField = subSchemaAndTypeComposers.discriminator?.propertyName;
  return function resolveType(data: any, context: any, info: GraphQLResolveInfo) {
    if (data.__typename) {
      return data.__typename;
    } else if (discriminatorField != null && data[discriminatorField]) {
      return data[discriminatorField];
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
    const error = new GraphQLError(`Received data doesn't met the union`, null, null, null, null, null, {
      validationErrors,
    });
    return error;
  };
}
