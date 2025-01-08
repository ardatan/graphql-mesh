import { GraphQLObjectType, GraphQLSchema, printSchema, type GraphQLField } from 'graphql';
import { createFilterTransform, createHoistFieldTransform } from '@graphql-mesh/fusion-composition';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { composeAndGetExecutor, composeAndGetPublicSchema } from './utils';

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
  });
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
"directive @hoist(subgraph: String, pathConfig: _HoistConfig) on FIELD_DEFINITION

directive @source(name: String!, type: String, subgraph: String!) on SCALAR | OBJECT | FIELD_DEFINITION | ARGUMENT_DEFINITION | INTERFACE | UNION | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION

type Query {
  users(limit: Int!, page: Int): [User!]!
}

type User {
  id: ID!
  name: String!
}

input _HoistConfig {
  _fake: String
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
"directive @hoist(subgraph: String, pathConfig: _HoistConfig) on FIELD_DEFINITION

directive @source(name: String!, type: String, subgraph: String!) on SCALAR | OBJECT | FIELD_DEFINITION | ARGUMENT_DEFINITION | INTERFACE | UNION | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION

type Query {
  users(limit: Int!, page: Int): [User!]!
}

type User {
  id: ID!
  name: String!
}

input _HoistConfig {
  _fake: String
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
"directive @hoist(subgraph: String, pathConfig: _HoistConfig) on FIELD_DEFINITION

directive @source(name: String!, type: String, subgraph: String!) on SCALAR | OBJECT | FIELD_DEFINITION | ARGUMENT_DEFINITION | INTERFACE | UNION | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION

type Query {
  users: [User!]!
}

type User {
  id: ID!
  name: String!
}

input _HoistConfig {
  _fake: String
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
"directive @hoist(subgraph: String, pathConfig: _HoistConfig) on FIELD_DEFINITION

directive @source(name: String!, type: String, subgraph: String!) on SCALAR | OBJECT | FIELD_DEFINITION | ARGUMENT_DEFINITION | INTERFACE | UNION | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION

type Query {
  users(page: Int): [User!]!
}

type User {
  id: ID!
  name: String!
}

input _HoistConfig {
  _fake: String
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
"directive @hoist(subgraph: String, pathConfig: _HoistConfig) on FIELD_DEFINITION

directive @source(name: String!, type: String, subgraph: String!) on SCALAR | OBJECT | FIELD_DEFINITION | ARGUMENT_DEFINITION | INTERFACE | UNION | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION

type Query {
  users(page: Int): [User!]!
}

type User {
  id: ID!
  name: String!
}

input _HoistConfig {
  _fake: String
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
  it('creates a new field if the field name is different', async () => {
    const transform = createHoistFieldTransform({
      mapping: [
        {
          typeName: 'Query',
          pathConfig: ['users', 'results'],
          newFieldName: 'usersResults',
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
"directive @hoist(subgraph: String, pathConfig: _HoistConfig) on FIELD_DEFINITION

directive @source(name: String!, type: String, subgraph: String!) on SCALAR | OBJECT | FIELD_DEFINITION | ARGUMENT_DEFINITION | INTERFACE | UNION | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION

type Query {
  users(limit: Int!, page: Int): UserSearchResult
  usersResults(limit: Int!, page: Int): [User!]!
}

type UserSearchResult {
  page: Int!
}

type User {
  id: ID!
  name: String!
}

input _HoistConfig {
  _fake: String
}"
`);
  });
  it('executes the new field correctly', async () => {
    const transform = createHoistFieldTransform({
      mapping: [
        {
          typeName: 'Query',
          pathConfig: ['users', 'results'],
          newFieldName: 'usersResults',
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
          usersResults(limit: 1) {
            id
            name
          }
        }
      `,
    });

    expect(result).toEqual({
      usersResults: [
        {
          id: '1',
          name: 'TEST',
        },
      ],
    });
  });
  it('combines with filter-schema', async () => {
    const newSchema = await composeAndGetPublicSchema([
      {
        schema,
        transforms: [
          createHoistFieldTransform({
            mapping: [
              {
                typeName: 'Query',
                pathConfig: ['users', 'results'],
                newFieldName: 'userList',
              },
            ],
          }),
          createFilterTransform({
            fieldFilter: (typeName, fieldName) => fieldName !== 'users',
          }),
        ],
        name: 'TEST',
      },
    ]);

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    expect(queryType).toBeDefined();
    const fields = queryType.getFields();
    expect(fields.users).toBeUndefined();
    expect(fields.userList).toBeDefined();
  });
});
