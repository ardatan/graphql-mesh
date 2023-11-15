import { ASTNode, ConstDirectiveNode, valueFromASTUntyped } from 'graphql';

export function getDirectiveExtensions(directableObj: {
  astNode?: ASTNode & { directives?: readonly ConstDirectiveNode[] };
  extensions?: any;
}): Record<string, any[]> {
  const directiveExtensions: Record<string, any[]> = {};
  if (directableObj.astNode?.directives?.length) {
    directableObj.astNode.directives.forEach(directive => {
      let existingDirectiveExtensions = directiveExtensions[directive.name.value];
      if (!existingDirectiveExtensions) {
        existingDirectiveExtensions = [];
        directiveExtensions[directive.name.value] = existingDirectiveExtensions;
      }
      existingDirectiveExtensions.push(
        directive.arguments
          ? Object.fromEntries(
              directive.arguments.map(arg => [arg.name.value, valueFromASTUntyped(arg.value)]),
            )
          : {},
      );
    });
  }
  if (directableObj.extensions?.directives) {
    for (const directiveName in directableObj.extensions.directives) {
      const directiveObjs = directableObj.extensions.directives[directiveName];
      if (Array.isArray(directiveObjs)) {
        directiveObjs.forEach(directiveObj => {
          let existingDirectiveExtensions = directiveExtensions[directiveName];
          if (!existingDirectiveExtensions) {
            existingDirectiveExtensions = [];
            directiveExtensions[directiveName] = existingDirectiveExtensions;
          }
          existingDirectiveExtensions.push(directiveObj);
        });
      } else {
        let existingDirectiveExtensions = directiveExtensions[directiveName];
        if (!existingDirectiveExtensions) {
          existingDirectiveExtensions = [];
          directiveExtensions[directiveName] = existingDirectiveExtensions;
        }
        existingDirectiveExtensions.push(directiveObjs);
      }
    }
  }
  return directiveExtensions;
}
