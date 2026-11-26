import {
  buildSchema,
  DirectiveLocation,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLUnionType,
  validateSchema,
} from 'graphql';
import { createNamingConventionTransform } from '@graphql-mesh/fusion-composition';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import {
  composeAndGetExecutor,
  composeAndGetPublicSchema,
  expectTheSchemaSDLToBe,
  printSortedSchema,
} from './utils';

describe('Naming Convention', () => {
  it('changes the name of a types, enums, fields and fieldArguments', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        user: user!
        userById(userId: ID!): user!
        usersByType(type: userType! = newbie): [user!]!
        node(id: ID!): node
      }

      union node = user | Post

      type user {
        Id: ID!
        Type: userType
      }
      type Post {
        id: ID!
      }
      enum userType {
        admin
        moderator
        newbie
      }
    `);
    const transform = createNamingConventionTransform({
      typeNames: 'pascalCase',
      enumValues: 'upperCase',
      fieldNames: 'camelCase',
      fieldArgumentNames: 'snakeCase',
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'SUBGRAPH1',
        schema,
        transforms: [transform],
      },
    ]);

    expect(newSchema.getType('user')).toBeUndefined();
    const userObjectType = newSchema.getType('User') as GraphQLObjectType;
    expect(userObjectType).toBeDefined();

    expect(newSchema.getType('node')).toBeUndefined();
    const nodeUnionType = newSchema.getType('Node') as GraphQLUnionType;
    expect(nodeUnionType).toBeDefined();

    const userObjectTypeFields = userObjectType.getFields();
    expect(userObjectTypeFields.Id).toBeUndefined();
    expect(userObjectTypeFields.id).toBeDefined();

    const nodeUnionTypeTypes = nodeUnionType.getTypes();
    expect(nodeUnionTypeTypes).toHaveLength(2);
    expect(nodeUnionTypeTypes[0].name).toBe('User');
    expect(nodeUnionTypeTypes[1].name).toBe('Post');

    expect(newSchema.getType('userType')).toBeUndefined();
    const userTypeEnumType = newSchema.getType('UserType') as GraphQLEnumType;
    expect(userTypeEnumType).toBeDefined();
    expect(userTypeEnumType.getValue('Admin')).toBeUndefined();
    expectTheSchemaSDLToBe(
      newSchema,
      /* GraphQL */ `
        type Query {
          user: User!
          userById(user_id: ID!): User!
          usersByType(type: UserType! = NEWBIE): [User!]!
          node(id: ID!): Node
        }

        union Node = User | Post

        type User {
          id: ID!
          type: UserType
        }

        type Post {
          id: ID!
        }

        enum UserType {
          ADMIN
          MODERATOR
          NEWBIE
        }
      `,
    );
  });

  it('executes the transformed schema properly', async () => {
    const subgraphSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          user(Input: UserSearchInput): User
          userById(userId: ID!): User
          userByType(type: UserType!): User
          node(id: ID!): Node
        }
        union Node = User | Post
        type User {
          id: ID
          first_name: String
          last_name: String
          Type: UserType!
          interests: [UserInterests!]!
        }
        type Post {
          id: ID!
        }
        input UserSearchInput {
          id: ID
          first_name: String
          last_name: String
          type: UserType
        }
        enum UserType {
          admin
          moderator
          newbie
        }
        enum UserInterests {
          books
          comics
          news
        }
      `,
      resolvers: {
        Query: {
          user: (root, args) => {
            return {
              id: args.Input.id,
              first_name: args.Input.first_name,
              last_name: args.Input.last_name,
              Type: args.Input.type,
            };
          },
          userById: (root, args) => {
            return {
              id: args.userId,
              first_name: 'John',
              last_name: 'Doe',
              Type: 'admin',
            };
          },
          userByType: () => {
            return {
              first_name: 'John',
              last_name: 'Smith',
              Type: 'admin',
              interests: ['books', 'comics'],
            };
          },
          node: (_, { id }) => {
            return {
              id,
            };
          },
        },
        Node: {
          __resolveType(obj: any) {
            if (obj.title) {
              return 'Post';
            }
            return 'User';
          },
        },
      },
    });
    const transform = createNamingConventionTransform({
      typeNames: 'lowerCase',
      enumValues: 'upperCase',
      fieldNames: 'camelCase',
      fieldArgumentNames: 'pascalCase',
    });
    const executor = composeAndGetExecutor([
      {
        name: 'SUBGRAPH1',
        schema: subgraphSchema,
        transforms: [transform],
      },
    ]);
    const result = await executor({
      query: /* GraphQL */ `
        {
          user(Input: { id: "0", firstName: "John", lastName: "Doe", type: ADMIN }) {
            id
            firstName
            lastName
            type
          }
        }
      `,
    });
    // Pass transformed output to the client
    expect(result?.user).toEqual({
      id: '0',
      firstName: 'John',
      lastName: 'Doe',
      type: 'ADMIN',
    });

    const result2 = await executor({
      query: /* GraphQL */ `
        {
          userById(UserId: "1") {
            id
            firstName
            lastName
            type
          }
        }
      `,
    });
    // Pass transformed output to the client
    expect(result2.userById).toEqual({
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      type: 'ADMIN',
    });

    const result3 = await executor({
      query: /* GraphQL */ `
        {
          userByType(Type: ADMIN) {
            firstName
            lastName
            type
            interests
          }
        }
      `,
    });
    // Pass transformed output to the client
    expect(result3.userByType).toEqual({
      firstName: 'John',
      lastName: 'Smith',
      type: 'ADMIN',
      interests: ['BOOKS', 'COMICS'],
    });

    const result4 = await executor({
      query: /* GraphQL */ `
        {
          node(Id: "1") {
            __typename
          }
        }
      `,
    });
    // Pass transformed output to the client
    expect(result4.node).toEqual({
      __typename: 'user',
    });
  });

  it('skips if the result is empty string', async () => {
    const subgraph = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          _: String!
        }
      `,
      resolvers: {
        Query: {
          _: () => 'test',
        },
      },
    });
    const transform = createNamingConventionTransform({
      fieldNames: 'camelCase',
    });
    const executor = composeAndGetExecutor([
      {
        name: 'SUBGRAPH1',
        schema: subgraph,
        transforms: [transform],
      },
    ]);
    const result = await executor({
      query: /* GraphQL */ `
        {
          _
        }
      `,
    });
    expect(result._).toBe('test');
  });

  it('applies to default values of enums for arguments', async () => {
    const subgraph = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          user: user!
          userById(userId: ID!): user!
          usersByType(type: userType! = newbie): [user!]!
          node(id: ID!): node
        }

        union node = user | Post

        type user {
          Id: ID!
          Type: userType
        }
        type Post {
          id: ID!
        }
        enum userType {
          admin
          moderator
          newbie
        }
      `,
    });
    const transform = createNamingConventionTransform({
      typeNames: 'pascalCase',
      enumValues: 'upperCase',
      fieldNames: 'camelCase',
      fieldArgumentNames: 'snakeCase',
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'SUBGRAPH1',
        schema: subgraph,
        transforms: [transform],
      },
    ]);
    const userTypeEnum = newSchema.getType('UserType') as GraphQLEnumType;
    expect(userTypeEnum).toBeDefined();
    const enumTypeValues = userTypeEnum.getValues().map(x => x.name);
    expect(enumTypeValues).toContain('ADMIN');
    expect(enumTypeValues).toContain('MODERATOR');
    expect(enumTypeValues).toContain('NEWBIE');

    const query = newSchema.getType('Query') as GraphQLObjectType;
    const fields = query.getFields();
    const fieldUsersByType = fields.usersByType;
    expect(fieldUsersByType).toBeDefined();
    expect(fieldUsersByType.args).toBeDefined();
    const userTypeArg = fieldUsersByType.args[0];
    expect(userTypeArg).toBeDefined();
    // GraphQL 16: defaultValue string; GraphQL 17: default.literal EnumValue
    const gql17Default = (
      userTypeArg as unknown as { default?: { literal?: { kind: string; value: string } } }
    ).default;
    const enumDefault =
      typeof userTypeArg.defaultValue === 'string'
        ? userTypeArg.defaultValue
        : gql17Default?.literal?.kind === 'EnumValue'
          ? gql17Default.literal.value
          : undefined;
    expect(enumDefault).toBe('NEWBIE');
  });

  it('resolves the data of renamed fields correctly when arguments are not changed', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          Cart_GetCart(cartId: String!, expand: [String]): Cart
        }

        type Cart {
          Id: String!
          Amount: Int!
        }
      `,
      resolvers: {
        Query: {
          Cart_GetCart: (_, args) => {
            return {
              Id: args.cartId,
              Amount: 1234,
            };
          },
        },
        Cart: {
          Id: root => root.Id,
          Amount: root => root.Amount,
        },
      },
    });
    const transform = createNamingConventionTransform({
      fieldNames: 'camelCase',
      fieldArgumentNames: 'camelCase',
    });
    const executor = composeAndGetExecutor([
      {
        name: 'SUBGRAPH1',
        schema,
        transforms: [transform],
      },
    ]);
    const data = await executor({
      query: /* GraphQL */ `
        {
          cartGetCart(cartId: "asdf") {
            id
            amount
          }
        }
      `,
    });
    expect(data.Cart_GetCart).not.toBeDefined();
    expect(data.cartGetCart).toBeDefined();
    expect(data.cartGetCart).not.toBeNull();
    expect(data.cartGetCart.id).toBe('asdf');
  });

  it('gates Neo4j @alias on transport metadata across schema invocations', () => {
    const transform = createNamingConventionTransform({
      fieldNames: 'camelCase',
    });
    const neo4jSchema = buildSchema(/* GraphQL */ `
      schema @transport(subgraph: "Movies", kind: "neo4j", location: "neo4j://localhost") {
        query: Query
      }
      directive @transport(subgraph: String!, kind: String!, location: String) repeatable on SCHEMA
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @alias(subgraph: String, property: String!) on FIELD_DEFINITION
      type Movie @node(subgraph: "Movies") {
        release_year: Int
      }
      type Query {
        movies: [Movie!]!
      }
    `);
    const bareNodeSchema = buildSchema(/* GraphQL */ `
      directive @node(idField: String) on OBJECT
      type Article @node(idField: "id") {
        release_year: Int
      }
      type Query {
        articles: [Article!]!
      }
    `);
    const ordinarySchema = buildSchema(/* GraphQL */ `
      type Movie {
        release_year: Int
      }
      type Query {
        movies: [Movie!]!
      }
    `);
    const moviesCfg = { name: 'Movies', schema: neo4jSchema };
    const bareCfg = { name: 'Articles', schema: bareNodeSchema };
    const otherCfg = { name: 'Other', schema: ordinarySchema };
    const neo4jNext = transform(neo4jSchema, moviesCfg);
    const neo4jField = (neo4jNext.getType('Movie') as GraphQLObjectType).getFields().releaseYear;
    expect(getDirectiveExtensions(neo4jField)?.alias?.[0]?.property).toBe('release_year');
    const bareNext = transform(bareNodeSchema, bareCfg);
    const bareField = (bareNext.getType('Article') as GraphQLObjectType).getFields().releaseYear;
    expect(getDirectiveExtensions(bareField)?.alias).toBeUndefined();
    const next = transform(ordinarySchema, otherCfg);
    const movie = next.getType('Movie') as GraphQLObjectType;
    const field = movie.getFields().releaseYear;
    expect(field).toBeDefined();
    expect(getDirectiveExtensions(field)?.alias).toBeUndefined();
  });

  it('keeps Neo4j transport gating when fieldNames nests another transform call', () => {
    const ordinarySchema = buildSchema(/* GraphQL */ `
      type Movie {
        release_year: Int
      }
      type Query {
        movies: [Movie!]!
      }
    `);
    let nestedOnce = false;
    const transform = createNamingConventionTransform({
      fieldNames: name => {
        // Nested call must not clear Neo4j gating for the outer Neo4j schema.
        if (!nestedOnce) {
          nestedOnce = true;
          transform(ordinarySchema, { name: 'Other', schema: ordinarySchema });
        }
        return name === 'release_year' ? 'releaseYear' : name;
      },
    });
    const neo4jSchema = buildSchema(/* GraphQL */ `
      schema @transport(subgraph: "Movies", kind: "neo4j", location: "neo4j://localhost") {
        query: Query
      }
      directive @transport(subgraph: String!, kind: String!, location: String) repeatable on SCHEMA
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @alias(subgraph: String, property: String!) on FIELD_DEFINITION
      type Movie @node(subgraph: "Movies") {
        release_year: Int
      }
      type Query {
        movies: [Movie!]!
      }
    `);
    const next = transform(neo4jSchema, { name: 'Movies', schema: neo4jSchema });
    const field = (next.getType('Movie') as GraphQLObjectType).getFields().releaseYear;
    expect(getDirectiveExtensions(field)?.alias?.[0]?.property).toBe('release_year');
  });

  it('Neo4j: does not stamp @alias on input object fields', () => {
    const transform = createNamingConventionTransform({
      fieldNames: 'camelCase',
    });
    const neo4jSchema = buildSchema(/* GraphQL */ `
      schema @transport(subgraph: "Movies", kind: "neo4j", location: "neo4j://localhost") {
        query: Query
      }
      directive @transport(subgraph: String!, kind: String!, location: String) repeatable on SCHEMA
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @alias(subgraph: String, property: String!) on FIELD_DEFINITION
      directive @cypher(
        subgraph: String
        statement: String!
        columnName: String!
      ) on FIELD_DEFINITION
      input SearchInput {
        search_term: String!
      }
      type Movie @node(subgraph: "Movies") {
        title: String
      }
      type Query {
        movies(input: SearchInput): [Movie!]!
          @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
      }
    `);
    const next = transform(neo4jSchema, { name: 'Movies', schema: neo4jSchema });
    const searchInput = next.getType('SearchInput') as any;
    expect(searchInput.getFields().searchTerm).toBeDefined();
    // Input fields rename but must not get `@alias` (invalid on INPUT_FIELD_DEFINITION).
    expect(getDirectiveExtensions(searchInput.getFields().searchTerm)?.alias).toBeUndefined();
  });

  it('Neo4j: aliases Cypher output fields; leaves relationship args unrenamed', () => {
    const transform = createNamingConventionTransform({
      fieldNames: 'camelCase',
      fieldArgumentNames: 'pascalCase',
    });
    const neo4jSchema = buildSchema(/* GraphQL */ `
      schema @transport(subgraph: "Movies", kind: "neo4j", location: "neo4j://localhost") {
        query: Query
      }
      directive @transport(subgraph: String!, kind: String!, location: String) repeatable on SCHEMA
      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @alias(subgraph: String, property: String!) on FIELD_DEFINITION
      directive @relationship(subgraph: String, type: String, direction: String) on FIELD_DEFINITION
      directive @cypher(
        subgraph: String
        statement: String!
        columnName: String!
      ) on FIELD_DEFINITION
      input MovieWhere {
        title: String
      }
      type Stats {
        total_count: Int!
      }
      type Person @node(subgraph: "Movies") {
        name: String
      }
      type Movie @node(subgraph: "Movies") {
        actors(where: MovieWhere): [Person!]!
          @relationship(subgraph: "Movies", type: "ACTED_IN", direction: "IN")
        similar(search_term: String!): [Movie!]!
          @cypher(subgraph: "Movies", statement: "RETURN this", columnName: "this")
      }
      type Query {
        stats: Stats
          @cypher(subgraph: "Movies", statement: "RETURN { total_count: 1 } AS s", columnName: "s")
      }
    `);
    const next = transform(neo4jSchema, { name: 'Movies', schema: neo4jSchema });
    const stats = next.getType('Stats') as GraphQLObjectType;
    expect(getDirectiveExtensions(stats.getFields().totalCount)?.alias?.[0]?.property).toBe(
      'total_count',
    );
    const actors = (next.getType('Movie') as GraphQLObjectType).getFields().actors;
    expect(actors.args.map(arg => arg.name)).toEqual(['where']);
    const similar = (next.getType('Movie') as GraphQLObjectType).getFields().similar;
    expect(similar.args.map(arg => arg.name)).toEqual(['SearchTerm']);
  });

  it('renames keys in input-object argument defaults with fieldNames', async () => {
    const schema = buildSchema(/* GraphQL */ `
      enum E {
        newbie
      }
      input Filter {
        user_status: E
      }
      type Query {
        search(filter: Filter = { user_status: newbie }): String
      }
    `);
    const transform = createNamingConventionTransform({
      fieldNames: 'camelCase',
      enumValues: 'upperCase',
    });
    // Assert on the transform output: federation compose on GraphQL 16 can drop
    // input-object argument defaults when re-printing subgraph SDL.
    const transformed = transform(schema, { name: 'SUBGRAPH1', schema });
    expect(printSortedSchema(transformed).replace(/\s+/g, ' ')).toMatch(
      /search\(filter: Filter = \{ ?userStatus: NEWBIE ?\}\)/,
    );
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'SUBGRAPH1',
        schema,
        transforms: [transform],
      },
    ]);
    const composed = printSortedSchema(newSchema).replace(/\s+/g, ' ');
    // GraphQL 16 federation compose can still drop input-object arg defaults to `{}`;
    // when the default survives, require the exact rewritten shape (not just the field name).
    if (composed.includes('filter: Filter = {}')) {
      expect(composed).toContain('userStatus');
    } else {
      expect(composed).toMatch(/search\(filter: Filter = \{ ?userStatus: NEWBIE ?\}\)/);
    }
  });

  it('rewrites enum defaults on directive arguments', async () => {
    const schema = buildSchema(/* GraphQL */ `
      enum E {
        newbie
      }
      directive @d(e: E = newbie) on FIELD_DEFINITION
      type Query {
        q: String @d
      }
    `);
    const transform = createNamingConventionTransform({
      enumValues: 'upperCase',
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'SUBGRAPH1',
        schema,
        transforms: [transform],
      },
    ]);
    const directive = newSchema.getDirective('d');
    expect(directive).toBeDefined();
    const arg = directive!.args.find(a => a.name === 'e');
    const gql17Default = (
      arg as unknown as { default?: { literal?: { kind: string; value: string } } }
    ).default;
    const enumDefault =
      typeof arg?.defaultValue === 'string'
        ? arg.defaultValue
        : gql17Default?.literal?.kind === 'EnumValue'
          ? gql17Default.literal.value
          : undefined;
    expect(enumDefault).toBe('NEWBIE');
  });

  it('keeps internal-only directive enum defaults when the wire value differs from the name', () => {
    const E = new GraphQLEnumType({
      name: 'E',
      values: {
        newbie: { value: 'wire' },
      },
    });
    const d = new GraphQLDirective({
      name: 'd',
      locations: [DirectiveLocation.FIELD_DEFINITION],
      args: {
        e: {
          type: E,
          defaultValue: 'wire',
        },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          q: {
            type: GraphQLString,
            astNode: undefined,
          },
        },
      }),
      directives: [d],
    });
    const transform = createNamingConventionTransform({
      enumValues: 'upperCase',
    });
    const transformed = transform(schema, { name: 'SUBGRAPH1', schema });
    expect(validateSchema(transformed)).toEqual([]);
    const arg = transformed.getDirective('d')?.args.find(a => a.name === 'e');
    expect(arg?.defaultValue).toBe('wire');
    const gql17Default = (arg as unknown as { default?: { value?: unknown } })?.default;
    // Must not invent `default: { value: 'WIRE' }` — public enum is NEWBIE, not WIRE.
    expect(gql17Default?.value).not.toBe('WIRE');
  });

  it('rewrites key-only directive-argument defaults when only fieldNames is set', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input Filter {
        item_count: Int
      }
      directive @d(f: Filter = { item_count: 1 }) on FIELD_DEFINITION
      type Query {
        q: String @d
      }
    `);
    const transform = createNamingConventionTransform({
      fieldNames: 'camelCase',
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'SUBGRAPH1',
        schema,
        transforms: [transform],
      },
    ]);
    const printed = printSortedSchema(newSchema);
    expect(printed).toContain('itemCount');
    expect(printed).not.toContain('item_count');
    const directive = newSchema.getDirective('d');
    const arg = directive?.args.find(a => a.name === 'f');
    const jsDefault = arg?.defaultValue as { itemCount?: number; item_count?: number } | undefined;
    if (jsDefault && typeof jsDefault === 'object') {
      expect(jsDefault).toEqual({ itemCount: 1 });
    } else {
      // GraphQL 17 may keep the default as a literal only.
      const lit = (
        arg as unknown as {
          default?: {
            literal?: {
              kind: string;
              fields?: { name: { value: string }; value: { kind: string; value?: string } }[];
            };
          };
        }
      ).default?.literal;
      expect(lit?.kind).toBe('ObjectValue');
      expect(lit?.fields?.map(f => f.name.value)).toEqual(['itemCount']);
      const itemCount = lit?.fields?.find(f => f.name.value === 'itemCount');
      expect(itemCount?.value).toMatchObject({ kind: 'IntValue', value: '1' });
    }
  });
});
