import type { GraphQLField, GraphQLOutputType } from 'graphql';
import { isListType, isNonNullType } from 'graphql';

function isOriginallyListType(type: GraphQLOutputType): boolean {
  if (isNonNullType(type)) {
    return isOriginallyListType(type.ofType);
  }
  return isListType(type);
}

export function processResolveRootFieldAnnotations(
  field: GraphQLField<any, any>,
  propertyName: string,
) {
  if (!field.resolve || field.resolve.name === 'defaultFieldResolver') {
    field.resolve = (root, args, context, info) => {
      // Prefer the original JSON property when present (legacy @httpOperation).
      // Fall back to the GraphQL field name when `@connect` selection already aliased it.
      const actualFieldObj =
        root == null ? undefined : propertyName in root ? root[propertyName] : root[info.fieldName];
      if (actualFieldObj != null) {
        const isArray = Array.isArray(actualFieldObj);
        const isListType = isOriginallyListType(info.returnType);
        if (isListType && !isArray) {
          return [actualFieldObj];
        } else if (!isListType && isArray) {
          return actualFieldObj[0];
        }
      }
      return actualFieldObj;
    };
  }
}
