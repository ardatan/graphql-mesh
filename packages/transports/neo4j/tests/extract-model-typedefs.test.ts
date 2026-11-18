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

      input CountCriteria {
        min: Int!
      }

      type Stats {
        count(criteria: CountCriteria!): Int!
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

      input PersonWhere {
        name: String
      }

      type Movie implements Production @node(subgraph: "Movies") {
        title: String!
        location: Point
        actors(where: PersonWhere): [Person!]!
          @relationship(subgraph: "Movies", type: "ACTED_IN", direction: "IN")
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
    expect(sdl).toMatch(/input CountCriteria/);
    expect(sdl).toMatch(/type Stats/);
    expect(sdl).toMatch(/count\(criteria: CountCriteria!\)/);
    expect(sdl).toMatch(/type Movie implements Production/);
    expect(sdl).toMatch(/location:\s*Point/);
    expect(sdl).toMatch(/similar\(criteria: SearchCriteria!\)/);
    expect(sdl).toMatch(/stats:\s*Stats/);
    expect(sdl).toMatch(/actors:\s*\[Person!\]!/);
    expect(sdl).not.toMatch(/actorsConnection/);
    expect(sdl).not.toMatch(/MovieActorsConnection/);
    expect(sdl).not.toMatch(/MovieWhere/);
    expect(sdl).not.toMatch(/PersonWhere/);

    const movie = extracted.definitions.find(
      def => def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === 'Movie',
    );
    expect(movie && movie.kind === Kind.OBJECT_TYPE_DEFINITION).toBe(true);
    if (movie && movie.kind === Kind.OBJECT_TYPE_DEFINITION) {
      const actors = movie.fields?.find(field => field.name.value === 'actors');
      expect(actors?.arguments ?? []).toHaveLength(0);
    }
  });

  it('strips foreign @node from authored cypher outputs; drops foreign-stamped fields', () => {
    const doc = parse(/* GraphQL */ `
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @cypher(
        subgraph: String
        statement: String!
        columnName: String!
      ) on FIELD_DEFINITION

      type Person @node(subgraph: "People") {
        name: String!
        bio: String @cypher(subgraph: "People", statement: "RETURN 1", columnName: "x")
      }

      type Movie @node(subgraph: "Movies") {
        title: String!
        featured: Person! @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
        secret: String @cypher(subgraph: "People", statement: "RETURN 1", columnName: "x")
      }

      type Query {
        movies: [Movie!]! @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
      }
    `);

    const extracted = extractNeo4jModelTypeDefs(doc, 'Movies');
    const sdl = print(extracted);
    expect(sdl).toMatch(/type Person/);
    expect(sdl).not.toMatch(/type Person[^\n]*@node/);
    expect(sdl).toMatch(/featured:\s*Person/);
    expect(sdl).not.toMatch(/secret:/);
    const person = extracted.definitions.find(
      def => def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === 'Person',
    );
    expect(person && person.kind === Kind.OBJECT_TYPE_DEFINITION).toBe(true);
    if (person && person.kind === Kind.OBJECT_TYPE_DEFINITION) {
      expect(person.directives?.some(d => d.name.value === 'node')).toBe(false);
      const fieldNames = (person.fields || []).map(field => field.name.value);
      expect(fieldNames).toContain('name');
      expect(fieldNames).not.toContain('bio');
    }
  });

  it('drops foreign-only deps on authored outputs; errors when the projection is empty', () => {
    const withForeignUnion = parse(/* GraphQL */ `
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @cypher(
        subgraph: String
        statement: String!
        columnName: String!
      ) on FIELD_DEFINITION

      union Credit = Actor | Director

      type Actor @node(subgraph: "People") {
        name: String!
      }

      type Director @node(subgraph: "People") {
        name: String!
      }

      type Person {
        name: String!
        credit: Credit @cypher(subgraph: "People", statement: "RETURN 1", columnName: "x")
      }

      type Movie @node(subgraph: "Movies") {
        title: String!
        featured: Person! @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
      }

      type Query {
        movies: [Movie!]! @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
      }
    `);
    const extracted = extractNeo4jModelTypeDefs(withForeignUnion, 'Movies');
    const sdl = print(extracted);
    expect(sdl).toMatch(/type Person/);
    expect(sdl).toMatch(/name:\s*String!/);
    expect(sdl).not.toMatch(/credit:/);
    expect(sdl).not.toMatch(/union Credit/);
    expect(sdl).not.toMatch(/type Actor/);
    expect(sdl).not.toMatch(/type Director/);

    const emptyProjection = parse(/* GraphQL */ `
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @alias(subgraph: String, property: String!) on FIELD_DEFINITION
      directive @cypher(
        subgraph: String
        statement: String!
        columnName: String!
      ) on FIELD_DEFINITION

      type Person {
        name: String! @alias(subgraph: "People", property: "full_name")
      }

      type Movie @node(subgraph: "Movies") {
        featured: Person! @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
      }

      type Query {
        movies: [Movie!]! @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
      }
    `);
    expect(() => extractNeo4jModelTypeDefs(emptyProjection, 'Movies')).toThrow(
      /Movie\.featured.*Person|Person.*Movie\.featured/,
    );
  });

  it('drops generated connections on authored outputs; keeps authored-only Point; checks interfaces', () => {
    const withConnection = parse(/* GraphQL */ `
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @cypher(
        subgraph: String
        statement: String!
        columnName: String!
      ) on FIELD_DEFINITION

      type FriendFriendsConnection {
        edges: [String]
      }

      type Friend @node(subgraph: "People") {
        name: String! @cypher(subgraph: "People", statement: "RETURN 1", columnName: "x")
      }

      type Person {
        name: String!
        friendsConnection: FriendFriendsConnection
      }

      type Movie @node(subgraph: "Movies") {
        featured: Person! @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
      }

      type Query {
        movies: [Movie!]! @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
      }
    `);
    const extracted = extractNeo4jModelTypeDefs(withConnection, 'Movies');
    const sdl = print(extracted);
    expect(sdl).toMatch(/type Person/);
    expect(sdl).toMatch(/name:\s*String!/);
    expect(sdl).not.toMatch(/friendsConnection/);
    expect(sdl).not.toMatch(/FriendFriendsConnection/);
    expect(sdl).not.toMatch(/type Friend/);

    const authoredPoint = parse(/* GraphQL */ `
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @cypher(
        subgraph: String
        statement: String!
        columnName: String!
      ) on FIELD_DEFINITION

      type Point {
        latitude: Float!
        longitude: Float!
      }

      type Person @node(subgraph: "People") {
        location: Point
      }

      type Movie @node(subgraph: "Movies") {
        featured: Person! @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
      }

      type Query {
        movies: [Movie!]! @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
      }
    `);
    const pointSdl = print(extractNeo4jModelTypeDefs(authoredPoint, 'Movies'));
    expect(pointSdl).toMatch(/type Point/);
    expect(pointSdl).toMatch(/location:\s*Point/);
    expect(pointSdl).not.toMatch(/type Person[^\n]*@node/);

    const brokenIface = parse(/* GraphQL */ `
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @alias(subgraph: String, property: String!) on FIELD_DEFINITION
      directive @cypher(
        subgraph: String
        statement: String!
        columnName: String!
      ) on FIELD_DEFINITION

      interface Named {
        name: String!
      }

      type Person implements Named {
        name: String! @alias(subgraph: "People", property: "full_name")
        nickname: String!
      }

      type Movie implements Named @node(subgraph: "Movies") {
        name: String!
        featured: Person! @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
      }

      type Query {
        movies: [Movie!]! @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
      }
    `);
    expect(() => extractNeo4jModelTypeDefs(brokenIface, 'Movies')).toThrow(
      /Person.*Named|missing name/i,
    );
  });

  it('keeps authored Aggregate scalars, union fields, spatial refs; prunes empty nests; projected ifaces', () => {
    const aggregateScalar = parse(/* GraphQL */ `
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @cypher(
        subgraph: String
        statement: String!
        columnName: String!
      ) on FIELD_DEFINITION

      type FriendFriendsConnection {
        edges: [String]
      }

      type Stats {
        totalAggregate: Int!
        friendsConnection: FriendFriendsConnection
      }

      type Movie @node(subgraph: "Movies") {
        title: String!
      }

      type Query {
        stats: Stats
          @cypher(
            subgraph: "Movies"
            statement: "RETURN { totalAggregate: 1 } AS s"
            columnName: "s"
          )
      }
    `);
    const aggregateSdl = print(extractNeo4jModelTypeDefs(aggregateScalar, 'Movies'));
    expect(aggregateSdl).toMatch(/totalAggregate:\s*Int!/);
    expect(aggregateSdl).not.toMatch(/friendsConnection/);

    const unionField = parse(/* GraphQL */ `
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @cypher(
        subgraph: String
        statement: String!
        columnName: String!
      ) on FIELD_DEFINITION

      union Credit = Actor | Director

      type Actor @node(subgraph: "Movies") {
        name: String!
      }

      type Director @node(subgraph: "Movies") {
        name: String!
      }

      type Stats {
        credit: Credit
      }

      type Movie @node(subgraph: "Movies") {
        title: String!
      }

      type Query {
        stats: Stats @cypher(subgraph: "Movies", statement: "RETURN 1 AS s", columnName: "s")
      }
    `);
    const unionSdl = print(extractNeo4jModelTypeDefs(unionField, 'Movies'));
    expect(unionSdl).toMatch(/credit:\s*Credit/);
    expect(unionSdl).toMatch(/union Credit/);

    const spatialWithModel = parse(/* GraphQL */ `
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @cypher(
        subgraph: String
        statement: String!
        columnName: String!
      ) on FIELD_DEFINITION

      type Point {
        latitude: Float!
        longitude: Float!
      }

      type Person @node(subgraph: "People") {
        location: Point
      }

      type Movie @node(subgraph: "Movies") {
        location: Point
        featured: Person! @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
      }

      type Query {
        movies: [Movie!]!
      }
    `);
    const spatialSdl = print(extractNeo4jModelTypeDefs(spatialWithModel, 'Movies'));
    expect(spatialSdl).toMatch(/type Person/);
    expect(spatialSdl).toMatch(/location:\s*Point/);
    // Movie regenerates Point — definition may be omitted, but Person.location stays.
    expect(spatialSdl).not.toMatch(/type Person[^\n]*@node/);

    const pruneNested = parse(/* GraphQL */ `
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @cypher(
        subgraph: String
        statement: String!
        columnName: String!
      ) on FIELD_DEFINITION

      type Address {
        line: String @cypher(subgraph: "People", statement: "RETURN 1", columnName: "x")
      }

      type Profile {
        address: Address
      }

      type Stats {
        count: Int!
        profile: Profile
      }

      type Movie @node(subgraph: "Movies") {
        title: String!
      }

      type Query {
        stats: Stats
          @cypher(subgraph: "Movies", statement: "RETURN { count: 1 } AS s", columnName: "s")
      }
    `);
    const pruneSdl = print(extractNeo4jModelTypeDefs(pruneNested, 'Movies'));
    expect(pruneSdl).toMatch(/count:\s*Int!/);
    expect(pruneSdl).not.toMatch(/profile:/);
    expect(pruneSdl).not.toMatch(/type Profile/);
    expect(pruneSdl).not.toMatch(/type Address/);

    const projectedIface = parse(/* GraphQL */ `
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @cypher(
        subgraph: String
        statement: String!
        columnName: String!
      ) on FIELD_DEFINITION

      interface Named {
        name: String!
        code: String! @cypher(subgraph: "People", statement: "RETURN 1", columnName: "x")
      }

      type Person implements Named {
        name: String!
        code: String! @cypher(subgraph: "People", statement: "RETURN 1", columnName: "x")
      }

      type Movie implements Named @node(subgraph: "Movies") {
        name: String!
        code: String! @cypher(subgraph: "People", statement: "RETURN 1", columnName: "x")
        featured: Person! @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
      }

      type Query {
        movies: [Movie!]!
      }
    `);
    const ifaceSdl = print(extractNeo4jModelTypeDefs(projectedIface, 'Movies'));
    expect(ifaceSdl).toMatch(/type Person implements Named/);
    expect(ifaceSdl).toMatch(/name:\s*String!/);
    expect(ifaceSdl).not.toMatch(/code:/);
  });
});
