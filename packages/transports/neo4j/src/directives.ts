import type { ConstDirectiveNode, DocumentNode } from 'graphql';
import { Kind, parse, visit } from 'graphql';

/**
 * Neo4j GraphQL author/model directives Mesh composes through.
 * Mesh adds optional `subgraph:` so multiple Neo4j sources stay attributed
 * (same pattern as `@sql__*` / `@mongo`). Strip `subgraph` before `@neo4j/graphql`.
 */
export const NEO4J_GRAPHQL_DIRECTIVE_SDL = /* GraphQL */ `
  directive @node(subgraph: String, labels: [String!]) on OBJECT
  directive @relationshipProperties(subgraph: String) on OBJECT
  directive @relationship(
    subgraph: String
    type: String
    direction: _RelationDirections
    properties: String
  ) on FIELD_DEFINITION
  enum _RelationDirections {
    IN
    OUT
  }
  directive @alias(subgraph: String, property: String!) on FIELD_DEFINITION
  directive @cypher(subgraph: String, statement: String!, columnName: String!) on FIELD_DEFINITION
  directive @plural(subgraph: String, value: String!) on OBJECT | INTERFACE | UNION
`;
/** Directives that carry Mesh `subgraph:` attribution for Neo4j model surface. */
export const NEO4J_SUBGRAPH_DIRECTIVES = new Set([
  'node',
  'relationship',
  'relationshipProperties',
  'alias',
  'cypher',
  'plural',
]);

export function getNeo4jDirectiveDefinitions(): DocumentNode['definitions'] {
  return parse(NEO4J_GRAPHQL_DIRECTIVE_SDL, { noLocation: true }).definitions;
}

function subgraphArg(subgraph: string) {
  return {
    kind: Kind.ARGUMENT as const,
    name: { kind: Kind.NAME as const, value: 'subgraph' },
    value: { kind: Kind.STRING as const, value: subgraph },
  };
}

/**
 * Ensure Mesh `subgraph:` on Neo4j model directives (does not invent a separate Mesh stamp).
 * Skips directives that already set `subgraph`.
 */
export function stampSubgraphOnNeo4jDirectives(
  typeDefs: DocumentNode,
  subgraph: string,
): DocumentNode {
  return visit(typeDefs, {
    Directive(node) {
      if (!NEO4J_SUBGRAPH_DIRECTIVES.has(node.name.value)) {
        return node;
      }
      if (node.arguments?.some(arg => arg.name.value === 'subgraph')) {
        return node;
      }
      return {
        ...node,
        arguments: [subgraphArg(subgraph), ...(node.arguments || [])],
      };
    },
  });
}

/**
 * Remove Mesh-only `subgraph` args (and the arg from directive definitions) before
 * `@neo4j/graphql`, whose upstream defs do not declare `subgraph`.
 */
export function stripSubgraphArgsFromNeo4jDirectives(typeDefs: DocumentNode): DocumentNode {
  return visit(typeDefs, {
    Directive(node) {
      if (!NEO4J_SUBGRAPH_DIRECTIVES.has(node.name.value) || !node.arguments?.length) {
        return node;
      }
      const arguments_ = node.arguments.filter(arg => arg.name.value !== 'subgraph');
      if (arguments_.length === node.arguments.length) {
        return node;
      }
      return { ...node, arguments: arguments_ };
    },
    DirectiveDefinition(node) {
      if (!NEO4J_SUBGRAPH_DIRECTIVES.has(node.name.value) || !node.arguments?.length) {
        return node;
      }
      const arguments_ = node.arguments.filter(arg => arg.name.value !== 'subgraph');
      if (arguments_.length === node.arguments.length) {
        return node;
      }
      return { ...node, arguments: arguments_ };
    },
  });
}

export function getDirectiveSubgraph(
  node: { directives?: readonly ConstDirectiveNode[] },
  directiveName: string,
): string | undefined {
  const directive = node.directives?.find(d => d.name.value === directiveName);
  const arg = directive?.arguments?.find(a => a.name.value === 'subgraph');
  if (arg?.value.kind === Kind.STRING) {
    return arg.value.value;
  }
  return undefined;
}
