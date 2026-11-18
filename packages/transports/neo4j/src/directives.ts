import type { DocumentNode } from 'graphql';
import { parse } from 'graphql';

/**
 * Neo4j GraphQL author/model directives Mesh composes through.
 * Runtime still uses the full `@neo4j/graphql` directive set when augmenting.
 */
export const NEO4J_GRAPHQL_DIRECTIVE_SDL = /* GraphQL */ `
  directive @node(
    """
    Neo4j labels when they differ from the GraphQL type name
    """
    labels: [String!]
  ) on OBJECT
  directive @relationshipProperties on OBJECT
  directive @relationship(
    type: String
    direction: _RelationDirections
    properties: String
  ) on FIELD_DEFINITION
  enum _RelationDirections {
    IN
    OUT
  }
  directive @alias(
    """
    Neo4j property name when it differs from the GraphQL field name
    """
    property: String!
  ) on FIELD_DEFINITION
  directive @cypher(statement: String!, columnName: String!) on FIELD_DEFINITION
  directive @plural(value: String!) on OBJECT | INTERFACE | UNION
  directive @introspection(
    subgraph: String
  ) on ENUM | OBJECT | INTERFACE | UNION | INPUT_OBJECT | FIELD_DEFINITION | SCALAR | ENUM_VALUE | INPUT_FIELD_DEFINITION
`;

export function getNeo4jDirectiveDefinitions(): DocumentNode['definitions'] {
  return parse(NEO4J_GRAPHQL_DIRECTIVE_SDL, { noLocation: true }).definitions;
}
