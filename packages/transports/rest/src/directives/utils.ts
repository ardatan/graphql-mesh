import type { ASTNode, ConstDirectiveNode } from 'graphql';
import { valueFromASTUntyped } from 'graphql';
import type { DirectiveAnnotation } from '@graphql-tools/utils';

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
