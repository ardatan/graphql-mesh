import { DirectiveAnnotation, memoize1 } from "@graphql-tools/utils";
import { ASTNode, valueFromASTUntyped } from "graphql";


export const getDefDirectives = memoize1(function getDefDirectives({ astNode, extensions }: { astNode?: ASTNode | null; extensions?: any }) {
  const directiveAnnotations: DirectiveAnnotation[] = [];
  if (astNode != null && 'directives' in astNode) {
    astNode.directives?.forEach(directiveNode => {
      directiveAnnotations.push({
        name: directiveNode.name.value,
        args:
          directiveNode.arguments?.reduce(
            (acc, arg) => {
              acc[arg.name.value] = valueFromASTUntyped(arg.value);
              return acc;
            },
            {} as Record<string, any>,
          ) ?? {},
      });
    });
  }
  if (extensions?.directives != null) {
    for (const directiveName in extensions.directives) {
      const directiveExt = extensions.directives[directiveName];
      if (directiveExt != null) {
        if (Array.isArray(directiveExt)) {
          directiveExt.forEach(directive => {
            directiveAnnotations.push({
              name: directiveName,
              args: directive,
            });
          });
        } else {
          directiveAnnotations.push({
            name: directiveName,
            args: directiveExt,
          });
        }
      }
    }
  }
  return directiveAnnotations;
});
