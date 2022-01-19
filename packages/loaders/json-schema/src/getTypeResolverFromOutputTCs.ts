import { GraphQLError, GraphQLResolveInfo } from 'graphql';
import { ObjectTypeComposer } from 'graphql-compose';
import Ajv, { ValidateFunction, ErrorObject } from 'ajv';

export function getTypeResolverFromOutputTCs(ajv: Ajv, outputTypeComposers: ObjectTypeComposer[]) {
  return function resolveType(data: any, content: any, info: GraphQLResolveInfo) {
    if (data.__typename) {
      return data.__typename;
    } else if (data.resourceType) {
      return data.resourceType;
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
