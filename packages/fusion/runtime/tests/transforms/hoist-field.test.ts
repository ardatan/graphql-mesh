import { GraphQLField, GraphQLObjectType, printSchema, GraphQLSchema } from 'graphql';
import { createHoistFieldTransform } from '@graphql-mesh/fusion-composition';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { composeAndGetExecutor, composeAndGetPublicSchema } from '../utils';

describe('Hoist Field', () => {
  let schema: GraphQLSchema;
  beforeEach(() => {
    schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
      type Query {
        users(limit: Int!, page: Int): UserSearchResult
      }

      type UserSearchResult {
        page: Int!
        results: [User!]!
      }

      type User {
        id: ID!
        name: String!
      }
    `,
      resolvers: {
        Query: {
          users: () => ({
            page: 1,
            results: [
              {
                id: '1',
                name: 'TEST',
              },
            ],
          }),
        },
      },
    });
  })
  it('hoists field with string pathConfig array', async () => {
    const transform = createHoistFieldTransform({
      mapping: [
        {
          typeName: 'Query',
          pathConfig: ['users', 'results'],
          newFieldName: 'users',
        },
      ],
    });

    const newSchema = await composeAndGetPublicSchema([
      {
        schema,
        transforms: [transform],
        name: 'TEST',
      },
    ]);

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    expect(queryType).toBeDefined();

    const fields = queryType.getFields();
    expect(fields.users).toBeDefined();

    expect(printSchema(newSchema)).toMatchInlineSnapshot(`
"type Query {
  users(limit: Int!, page: Int): [User!]!
}

scalar _HoistConfig

type UserSearchResult {
  page: Int!
}

type User {
  id: ID!
  name: String!
}"
`);
  });
  it('hoists field with mixed pathConfig array', async () => {
    const transform = createHoistFieldTransform({
      mapping: [
        {
          typeName: 'Query',
          pathConfig: [
            {
              fieldName: 'users',
              filterArgs: [],
            },
            'results',
          ],
          newFieldName: 'users',
        },
      ],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        schema,
        transforms: [transform],
        name: 'TEST',
      },
    ]);
    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    expect(queryType).toBeDefined();

    const fields = queryType.getFields();
    expect(fields.users).toBeDefined();

    expect(printSchema(newSchema)).toMatchInlineSnapshot(`
"type Query {
  users(limit: Int!, page: Int): [User!]!
}

scalar _HoistConfig

type UserSearchResult {
  page: Int!
}

type User {
  id: ID!
  name: String!
}"
`);
  });
  it('hoists field and filter args with global flag', async () => {
    const transform = createHoistFieldTransform({
      mapping: [
        {
          typeName: 'Query',
          pathConfig: ['users', 'results'],
          newFieldName: 'users',
          filterArgsInPath: true,
        },
      ],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        schema,
        transforms: [transform],
        name: 'TEST',
      },
    ]);
    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    expect(queryType).toBeDefined();

    const fields = queryType.getFields();
    expect(fields.users).toBeDefined();

    const args = (fields.users as GraphQLField<any, any>).args;
    expect(args.length).toEqual(0);

    expect(printSchema(newSchema)).toMatchInlineSnapshot(`
"type Query {
  users: [User!]!
}

scalar _HoistConfig

type UserSearchResult {
  page: Int!
}

type User {
  id: ID!
  name: String!
}"
`);
  });
  it('hoists field and filter individual args via pathConfig', async () => {
    const transform = createHoistFieldTransform({
      mapping: [
        {
          typeName: 'Query',
          pathConfig: [
            {
              fieldName: 'users',
              filterArgs: ['limit'],
            },
            'results',
          ],
          newFieldName: 'users',
        },
      ],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        schema,
        transforms: [transform],
        name: 'TEST',
      },
    ]);
    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    expect(queryType).toBeDefined();

    const fields = queryType.getFields();
    expect(fields.users).toBeDefined();

    const args = (fields.users as GraphQLField<any, any>).args;
    expect(args.length).toEqual(1);
    expect(args[0].name).toEqual('page');

    expect(printSchema(newSchema)).toMatchInlineSnapshot(`
"type Query {
  users(page: Int): [User!]!
}

scalar _HoistConfig

type UserSearchResult {
  page: Int!
}

type User {
  id: ID!
  name: String!
}"
`);
  });
  it('hoists field and filter individual args via pathConfig independent of global flag', async () => {
    const transform = createHoistFieldTransform({
      mapping: [
        {
          typeName: 'Query',
          pathConfig: [
            {
              fieldName: 'users',
              filterArgs: ['limit'],
            },
            'results',
          ],
          newFieldName: 'users',
          filterArgsInPath: true,
        },
      ],
    });

    const newSchema = await composeAndGetPublicSchema([
      {
        schema,
        transforms: [transform],
        name: 'TEST',
      },
    ]);

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    expect(queryType).toBeDefined();

    const fields = queryType.getFields();
    expect(fields.users).toBeDefined();

    const args = (fields.users as GraphQLField<any, any>).args;
    expect(args.length).toEqual(1);
    expect(args[0].name).toEqual('page');

    expect(printSchema(newSchema)).toMatchInlineSnapshot(`
"type Query {
  users(page: Int): [User!]!
}

scalar _HoistConfig

type UserSearchResult {
  page: Int!
}

type User {
  id: ID!
  name: String!
}"
`);
  });
  it('executes correctly', async () => {
    const transform = createHoistFieldTransform({
      mapping: [
        {
          typeName: 'Query',
          pathConfig: ['users', 'results'],
          newFieldName: 'users',
        },
      ],
    });

    const executor = composeAndGetExecutor([
      {
        schema,
        transforms: [transform],
        name: 'TEST',
      },
    ]);

    const result = await executor({
      query: /* GraphQL */ `
        {
          users(limit: 1) {
            id
            name
          }
        }
      `,
    });

    expect(result).toEqual({
      users: [
        {
          id: '1',
          name: 'TEST',
        },
      ],
    });
  });
});
