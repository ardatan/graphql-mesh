import { Kind, parse, print } from 'graphql';
import { extractNeo4jModelTypeDefs } from '../src/executor.js';

describe('extractNeo4jModelTypeDefs', () => {
  it('keeps interfaces, cypher outputs/inputs, Point fields; drops generated connections', () => {
    const doc = parse(/* GraphQL */ `
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @relationship(
        subgraph: String
        type: String
        direction: String
        properties: String
      ) on FIELD_DEFINITION
      directive @cypher(
        subgraph: String
        statement: String!
        columnName: String!
      ) on FIELD_DEFINITION

      interface Production {
        title: String!
      }

      input SearchCriteria {
        needle: String!
      }

      type Stats {
        count: Int!
      }

      type Point {
        latitude: Float!
        longitude: Float!
      }

      type MovieActorsConnection {
        edges: [String]
      }

      input MovieWhere {
        title: String
      }

      type Movie implements Production @node(subgraph: "Movies") {
        title: String!
        location: Point
        actors: [Person!]! @relationship(subgraph: "Movies", type: "ACTED_IN", direction: "IN")
        actorsConnection(where: MovieWhere): MovieActorsConnection
        similar(criteria: SearchCriteria!): [Movie!]!
          @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
      }

      type Person @node(subgraph: "Movies") {
        name: String!
      }

      type Query {
        movies: [Movie!]!
        stats: Stats
          @cypher(subgraph: "Movies", statement: "RETURN { count: 1 } AS s", columnName: "s")
      }
    `);

    const extracted = extractNeo4jModelTypeDefs(doc, 'Movies');
    const sdl = print(extracted);

    expect(sdl).toMatch(/interface Production/);
    expect(sdl).toMatch(/input SearchCriteria/);
    expect(sdl).toMatch(/type Stats/);
    expect(sdl).toMatch(/type Movie implements Production/);
    expect(sdl).toMatch(/location:\s*Point/);
    expect(sdl).toMatch(/similar\(criteria: SearchCriteria!\)/);
    expect(sdl).toMatch(/stats:\s*Stats/);
    expect(sdl).toMatch(/actors:\s*\[Person!\]!/);
    expect(sdl).not.toMatch(/actorsConnection/);
    expect(sdl).not.toMatch(/MovieActorsConnection/);
    expect(sdl).not.toMatch(/MovieWhere/);

    const movie = extracted.definitions.find(
      def => def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === 'Movie',
    );
    expect(movie && movie.kind === Kind.OBJECT_TYPE_DEFINITION).toBe(true);
    if (movie && movie.kind === Kind.OBJECT_TYPE_DEFINITION) {
      const actors = movie.fields?.find(field => field.name.value === 'actors');
      expect(actors?.arguments ?? []).toHaveLength(0);
    }
  });
});
