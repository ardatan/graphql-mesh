import type { GraphQLLeafType } from 'graphql';

export function processTypeScriptAnnotations(type: GraphQLLeafType, typeDefinition: string) {
  type.extensions = type.extensions || {};
  (type.extensions as any).codegenScalarType = typeDefinition;
}
