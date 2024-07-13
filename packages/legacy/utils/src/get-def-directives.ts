import { valueFromASTUntyped } from 'graphql';
import type { ASTNode, GraphQLSchema } from 'graphql';
import type { DirectiveAnnotation } from '@graphql-tools/utils';
import { getArgumentValues } from '@graphql-tools/utils';

export function getDefDirectives(
  schema: GraphQLSchema,
  { astNode, extensions }: { astNode?: ASTNode | null; extensions?: any },
  subgraph?: string,
) {
  const directiveAnnotations: DirectiveAnnotation[] = [];
  if (astNode != null && 'directives' in astNode) {
    astNode.directives?.forEach(directiveNode => {
      const directiveName = directiveNode.name.value;
      const schemaDirective = schema.getDirective(directiveName);
      const directiveAnnotation = {
        name: directiveNode.name.value,
        args: schemaDirective
          ? getArgumentValues(schemaDirective, directiveNode)
          : (directiveNode.arguments?.reduce(
              (acc, arg) => {
                acc[arg.name.value] = valueFromASTUntyped(arg.value);
                return acc;
              },
              {} as Record<string, any>,
            ) ?? {}),
      };
      if (
        subgraph &&
        directiveAnnotation.args.subgraph &&
        directiveAnnotation.args.subgraph !== subgraph
      )
        return;
      directiveAnnotations.push(directiveAnnotation);
    });
  }
  if (extensions?.directives != null) {
    for (const directiveName in extensions.directives) {
      const directiveExt = extensions.directives[directiveName];
      if (directiveExt != null) {
        if (Array.isArray(directiveExt)) {
          directiveExt.forEach(directive => {
            if (subgraph && directive.subgraph && directive.subgraph !== subgraph) return;
            directiveAnnotations.push({
              name: directiveName,
              args: directive,
            });
          });
        } else {
          if (subgraph && directiveExt.subgraph && directiveExt.subgraph !== subgraph) continue;
          directiveAnnotations.push({
            name: directiveName,
            args: directiveExt,
          });
        }
      }
    }
  }
  return directiveAnnotations;
}
