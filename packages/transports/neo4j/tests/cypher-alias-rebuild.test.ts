import { Kind, parse, print } from 'graphql';
import { extractNeo4jModelTypeDefs } from '../src/executor.js';

/**
 * Coverage for already-landed `@alias(property:)` on Cypher output fields through extract.
 * Full runtime Cypher-map remapping (when `@alias` alone is insufficient after rebuild) is
 * deferred with the broader Neo4j rename redesign.
 */
describe('Neo4j Cypher output @alias through extract', () => {
  it('extract keeps @alias(property: total_count) on totalCount', () => {
    const doc = parse(/* GraphQL */ `
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @alias(subgraph: String, property: String!) on FIELD_DEFINITION
      directive @cypher(
        subgraph: String
        statement: String!
        columnName: String!
      ) on FIELD_DEFINITION

      type Stats {
        totalCount: Int! @alias(subgraph: "Movies", property: "total_count")
      }

      type Movie @node(subgraph: "Movies") {
        title: String
      }

      type Query {
        stats: Stats!
          @cypher(subgraph: "Movies", statement: "RETURN { total_count: 3 } AS s", columnName: "s")
      }
    `);
    const extracted = extractNeo4jModelTypeDefs(doc, 'Movies');
    const sdl = print(extracted);
    expect(sdl).toMatch(/totalCount:\s*Int!\s*@alias\([^)]*property:\s*"total_count"/);
    const stats = extracted.definitions.find(
      def => def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === 'Stats',
    );
    expect(stats && stats.kind === Kind.OBJECT_TYPE_DEFINITION).toBe(true);
    if (stats && stats.kind === Kind.OBJECT_TYPE_DEFINITION) {
      const totalCount = stats.fields?.find(field => field.name.value === 'totalCount');
      const alias = totalCount?.directives?.find(d => d.name.value === 'alias');
      const property = alias?.arguments?.find(a => a.name.value === 'property');
      expect(property?.value.kind === Kind.STRING && property.value.value).toBe('total_count');
    }
  });
});
