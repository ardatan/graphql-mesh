import type { ASTNode, ConstDirectiveNode, GraphQLArgument, GraphQLInputType } from 'graphql';
import {
  isInputObjectType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  valueFromASTUntyped,
} from 'graphql';
import { asArray, type DirectiveAnnotation } from '@graphql-tools/utils';

export function getDirectiveAnnotations(directableObj: {
  astNode?: ASTNode & { directives?: readonly ConstDirectiveNode[] };
  extensions?: Record<string, any>;
}): DirectiveAnnotation[] {
  const directiveAnnotations: DirectiveAnnotation[] = [];
  const directiveExtensions = directableObj.extensions?.directives;
  if (directiveExtensions) {
    for (const directiveName in directiveExtensions) {
      const args = directiveExtensions[directiveName];
      directiveAnnotations.push({
        name: directiveName,
        args,
      });
    }
  }
  const directiveAstNodes = directableObj.astNode?.directives;
  if (directiveAstNodes) {
    for (const directiveNode of directiveAstNodes) {
      const args: Record<string, any> = {};
      for (const argNode of directiveNode.arguments || []) {
        const argValue = valueFromASTUntyped(argNode.value);
        args[argNode.name.value] = argValue;
        directiveAnnotations.push({
          name: directiveNode.name.value,
          args,
        });
      }
    }
  }

  return directiveAnnotations;
}

function normalizeArgValueForInterpolation(argValue: any): any {
  if (argValue instanceof Date) {
    return argValue.toJSON();
  }
  return argValue;
}

export function serializeArgumentsForInterpolation(argValue: any, argType: GraphQLInputType) {
  if (isScalarType(argType)) {
    try {
      return normalizeArgValueForInterpolation(argType.serialize(argValue));
    } catch (e) {
      return normalizeArgValueForInterpolation(argValue);
    }
  } else if (isListType(argType)) {
    return asArray(argValue).map(item => serializeArgumentsForInterpolation(item, argType.ofType));
  } else if (isInputObjectType(argType)) {
    const serializedObj: Record<string, any> = {};
    const argTypeFields = argType.getFields();
    for (const fieldName in argValue) {
      const fieldValue = argValue[fieldName];
      const fieldType = argTypeFields[fieldName]?.type;
      if (fieldType) {
        serializedObj[fieldName] = serializeArgumentsForInterpolation(fieldValue, fieldType);
      }
    }
    return serializedObj;
  } else if (isNonNullType(argType)) {
    return serializeArgumentsForInterpolation(argValue, argType.ofType);
  }

  return normalizeArgValueForInterpolation(argValue);
}
