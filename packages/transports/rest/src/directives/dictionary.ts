import type { GraphQLField } from 'graphql';

export function processDictionaryDirective(
  fieldMap: Record<string, GraphQLField<any, any>>,
  field: GraphQLField<any, any>,
) {
  field.resolve = function dictionaryDirectiveHandler(root) {
    const result = [];
    for (const key in root) {
      if (key in fieldMap) {
        continue;
      }
      result.push({
        key,
        value: root[key],
      });
    }
    return result;
  };
}
