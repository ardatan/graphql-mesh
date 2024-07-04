import type { GraphQLField } from 'graphql';

export function processFlattenAnnotations(field: GraphQLField<any, any>) {
  if (!field.resolve || field.resolve.name === 'defaultFieldResolver') {
    const fieldName = field.name;
    field.resolve = function flattenDirectiveHandler(root) {
      let result = root[fieldName];
      if (!Array.isArray(root)) {
        result = [result];
      }
      return result.flat(Infinity);
    };
  }
}
