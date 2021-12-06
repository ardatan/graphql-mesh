import { inspect } from '@graphql-tools/utils';
import { GraphQLResolveInfo } from 'graphql';
import { ObjectTypeComposer } from 'graphql-compose';
import Ajv, { ValidateFunction } from 'ajv';

export function getTypeResolverFromOutputTCs(ajv: Ajv, outputTypeComposers: ObjectTypeComposer[]) {
  return function resolveType(data: any, content: any, info: GraphQLResolveInfo) {
    if (data.__typename) {
      return data.__typename;
    } else if (data.resourceType) {
      return data.resourceType;
    }
    const errors = new Map<string, string>();
    for (const outputTypeComposer of outputTypeComposers) {
      const validateFn = outputTypeComposer.getExtension('validateWithJSONSchema') as ValidateFunction;
      if (validateFn) {
        const isValid = validateFn(data);
        const typeName = outputTypeComposer.getTypeName();
        if (isValid) {
          return typeName;
        }
        errors.set(typeName, ajv.errorsText(ajv.errors));
      }
    }
    throw new AggregateError(
      errors.values(),
      `Received data doesn't met the union; \n Data: ${inspect(data)} \n Errors:\n${[...errors.entries()].map(
        ([typeName, error]) => ` - ${typeName}: \n      ${error}\n`
      )}`
    );
  };
}
