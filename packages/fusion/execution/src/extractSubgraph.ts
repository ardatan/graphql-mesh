import {
  ASTNode,
  buildASTSchema,
  ConstDirectiveNode,
  GraphQLSchema,
  Kind,
  parseType,
  visit,
} from 'graphql';
import { getDocumentNodeFromSchema } from '@graphql-tools/utils';

export function extractSubgraphFromFusiongraph(subgraph: string, fusiongraph: GraphQLSchema) {
  const fusiongraphAst = getDocumentNodeFromSchema(fusiongraph);
  const filterNodeBySubgraph = createFilterNodeBySubgraph(subgraph);
  const filteredAst = visit(fusiongraphAst, {
    Directive(node) {
      const subgraphArgument = node.arguments?.find(argument => argument.name.value === 'subgraph');
      if (
        subgraphArgument != null &&
        subgraphArgument.value.kind === Kind.STRING &&
        subgraphArgument.value.value !== subgraph
      ) {
        return null;
      }
      return node;
    },
    ObjectTypeDefinition: {
      enter: filterNodeBySubgraph,
    },
    FieldDefinition: {
      enter: filterNodeBySubgraph,
    },
    EnumTypeDefinition: {
      enter: filterNodeBySubgraph,
    },
    EnumValueDefinition: {
      enter: filterNodeBySubgraph,
    },
    InputObjectTypeDefinition: {
      enter: filterNodeBySubgraph,
    },
    ScalarTypeDefinition: {
      enter: filterNodeBySubgraph,
    },
  });

  return buildASTSchema(filteredAst, {
    assumeValid: true,
    assumeValidSDL: true,
  });
}

function createFilterNodeBySubgraph(subgraph: string) {
  return function filterNodeBySubgraph(
    node: ASTNode & { directives?: readonly ConstDirectiveNode[] },
  ) {
    const sourceDirectives = node.directives?.filter(
      directive => directive.name.value === 'source',
    );
    const resolverDirectives = node.directives?.filter(
      directive => directive.name.value === 'resolver',
    );
    for (const sourceDirective of sourceDirectives ?? []) {
      const subgraphArgument = sourceDirective.arguments?.find(
        argument => argument.name.value === 'subgraph',
      );
      if (
        subgraphArgument != null &&
        subgraphArgument.value.kind === Kind.STRING &&
        subgraphArgument.value.value === subgraph
      ) {
        let finalNode = node as any;
        const nameArgument = sourceDirective.arguments?.find(
          argument => argument.name.value === 'name',
        );
        if (nameArgument?.value.kind === Kind.STRING) {
          finalNode = {
            ...node,
            name: {
              kind: Kind.NAME,
              value: nameArgument.value.value,
            },
          };
        }
        const typeArgument = sourceDirective.arguments?.find(
          argument => argument.name.value === 'type',
        );
        if (typeArgument?.value.kind === Kind.STRING) {
          const typeStr = typeArgument.value.value;
          finalNode = {
            ...finalNode,
            type: parseType(typeStr, { noLocation: true }),
          };
        }
        return finalNode;
      }
    }
    if (sourceDirectives.length > 0 || resolverDirectives.length > 0) {
      return null;
    }
    return node;
  };
}
