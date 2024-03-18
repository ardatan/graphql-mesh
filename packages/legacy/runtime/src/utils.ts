import { ASTNode, BREAK, getNamedType, GraphQLSchema, visit } from 'graphql';
import { getDocumentString } from '@envelop/core';
import { MapperKind, mapSchema, memoize1 } from '@graphql-tools/utils';

export const isStreamOperation = memoize1(function isStreamOperation(astNode: ASTNode): boolean {
  if (globalThis.process?.env?.DISABLE_JIT) {
    return true;
  }
  const documentStr = getDocumentString(astNode);
  let isStream = false;
  if (documentStr.includes('@stream')) {
    visit(astNode, {
      Field: {
        enter(node): typeof BREAK {
          if (node.directives?.some(d => d.name.value === 'stream')) {
            isStream = true;
            return BREAK;
          }
          return undefined;
        },
      },
    });
  }
  return isStream;
});

export const isGraphQLJitCompatible = memoize1(function isGraphQLJitCompatible(
  schema: GraphQLSchema,
) {
  if (globalThis.process?.env?.DISABLE_JIT) {
    return false;
  }
  let compatibleSchema = true;
  mapSchema(schema, {
    [MapperKind.INPUT_OBJECT_TYPE]: type => {
      const fieldMap = type.getFields();
      for (const fieldName in fieldMap) {
        const fieldObj = fieldMap[fieldName];
        const namedType = getNamedType(fieldObj.type);
        if (namedType.name === type.name) {
          compatibleSchema = false;
          return undefined;
        }
      }
      return undefined;
    },
  });
  if (compatibleSchema) {
    try {
      // eslint-disable-next-line no-new-func
      const a = new Function('return true');
      return a();
    } catch (e) {
      return false;
    }
  }
  return false;
});
