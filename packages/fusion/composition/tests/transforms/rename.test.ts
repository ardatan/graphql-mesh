import {
  buildSchema,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
} from 'graphql';
import { createRenameTransform } from '@graphql-mesh/fusion-composition';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { composeAndGetExecutor, composeAndGetPublicSchema } from './utils';

describe('Rename', () => {
  let schema: GraphQLSchema;
  beforeEach(() => {
    schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          my_user: MyUser!
          my_book: MyBook!
          profile(
            profile_id: ID!
            role: String
            some_argument: String
            another_argument: Int
          ): Profile
          my_node(id: ID!): MyNode
        }

        union MyNode = MyUser | MyBook | Profile

        type MyUser {
          id: ID!
          name: String!
        }

        type Profile {
          id: ID!
          isActive: Boolean!
        }

        type MyBook {
          id: ID!
          hits: Int!
        }
      `,
      resolvers: {
        Query: {
          my_user: () => ({ id: 'userId' }),
          profile: (_, args) => ({ id: `profile_${args.profile_id}` }),
          my_node: (_, { id }) => ({ id }),
        },
        MyNode: {
          __resolveType({ id }: any) {
            if (id === '1') {
              return 'MyUser';
            } else if (id === '2') {
              return 'Profile';
            } else {
              return 'MyBook';
            }
          },
        },
      },
    });
  });
  it('changes the name of a type', async () => {
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: 'MyUser',
          },
          to: {
            type: 'User',
          },
        },
      ],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);

    expect(newSchema.getType('MyUser')).toBeUndefined();
    expect(newSchema.getType('User')).toBeDefined();
  });
  it('changes the name of a field', async () => {
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: 'Query',
            field: 'my_user',
          },
          to: {
            type: 'Query',
            field: 'user',
          },
        },
      ],
    });

    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.my_user).toBeUndefined();
    expect(fieldMap.user).toBeDefined();
  });
  it('resolves renamed fields', async () => {
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: 'MyUser',
            field: 'id',
          },
          to: {
            type: 'MyUser',
            field: 'userId',
          },
        },
      ],
    });

    const executor = composeAndGetExecutor([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);

    const result = await executor({
      query: /* GraphQL */ `
        {
          my_user {
            userId
          }
        }
      `,
    });

    expect(result).toMatchObject({ my_user: { userId: 'userId' } });
  });
  it('resolves abstract types', async () => {
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: 'My(.*)',
          },
          to: {
            type: '$1',
          },
          useRegExpForTypes: true,
        },
      ],
    });
    const executor = composeAndGetExecutor([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);
    const result1 = await executor({
      query: /* GraphQL */ `
        {
          my_node(id: "1") {
            __typename
          }
        }
      `,
    });
    expect(result1).toMatchObject({ my_node: { __typename: 'User' } });
    const result2 = await executor({
      query: /* GraphQL */ `
        {
          my_node(id: "2") {
            __typename
          }
        }
      `,
    });
    expect(result2).toMatchObject({ my_node: { __typename: 'Profile' } });
    const result3 = await executor({
      query: /* GraphQL */ `
        {
          my_node(id: "3") {
            __typename
          }
        }
      `,
    });
    expect(result3).toMatchObject({ my_node: { __typename: 'Book' } });
  });
  it('changes multiple type names', async () => {
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: 'My(.*)',
          },
          to: {
            type: '$1',
          },
          useRegExpForTypes: true,
        },
      ],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);

    expect(newSchema.getType('MyNode')).toBeUndefined();
    expect(newSchema.getType('Node')).toBeDefined();
    expect(newSchema.getType('MyUser')).toBeUndefined();
    expect(newSchema.getType('User')).toBeDefined();
    expect(newSchema.getType('Profile')).toBeDefined();
    expect(newSchema.getType('MyBook')).toBeUndefined();
    expect(newSchema.getType('Book')).toBeDefined();
  });
  it('does not rename default scalar types', async () => {
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: '(.*)',
          },
          to: {
            type: 'Prefixed_$1',
          },
          useRegExpForTypes: true,
        },
      ],
    });

    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);
    const userField = (newSchema.getType('Prefixed_MyUser') as GraphQLObjectType).getFields();
    const profileField = (newSchema.getType('Prefixed_Profile') as GraphQLObjectType).getFields();
    const bookField = (newSchema.getType('Prefixed_MyBook') as GraphQLObjectType).getFields();

    expect((userField.id.type as GraphQLNonNull<GraphQLScalarType>).ofType.toString()).toBe('ID');
    expect((userField.name.type as GraphQLNonNull<GraphQLScalarType>).ofType.toString()).toBe(
      'String',
    );

    expect((profileField.id.type as GraphQLNonNull<GraphQLScalarType>).ofType.toString()).toBe(
      'ID',
    );
    expect(
      (profileField.isActive.type as GraphQLNonNull<GraphQLScalarType>).ofType.toString(),
    ).toBe('Boolean');

    expect((bookField.id.type as GraphQLNonNull<GraphQLScalarType>).ofType.toString()).toBe('ID');
    expect((bookField.hits.type as GraphQLNonNull<GraphQLScalarType>).ofType.toString()).toBe(
      'Int',
    );
  });
  it('changes the name of multiple fields', async () => {
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: 'Query',
            field: 'my_(.*)',
          },
          to: {
            type: 'Query',
            field: '$1',
          },
          useRegExpForFields: true,
        },
      ],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);
    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.my_node).toBeUndefined();
    expect(fieldMap.node).toBeDefined();
    expect(fieldMap.my_user).toBeUndefined();
    expect(fieldMap.user).toBeDefined();
    expect(fieldMap.my_book).toBeUndefined();
    expect(fieldMap.book).toBeDefined();
  });
  it('replaces the first occurrence of a substring in a field', async () => {
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: 'Query',
            field: 'o(.*)',
          },
          to: {
            type: 'Query',
            field: '$1',
          },
          useRegExpForFields: true,
        },
      ],
    });

    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);
    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.my_node).toBeUndefined();
    expect(fieldMap.my_nde).toBeDefined();
    expect(fieldMap.my_book).toBeUndefined();
    expect(fieldMap.my_bok).toBeDefined();
  });
  it('replaces all occurrences of a substring in a type', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        api_user_v1_api: ApiUserV1Api!
      }

      type ApiUserV1Api {
        id: ID!
      }
    `);
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: 'Api(.*?)',
          },
          to: {
            type: '$1',
          },
          useRegExpForTypes: true,
          regExpFlags: 'g',
        },
      ],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);

    expect(newSchema.getType('ApiUserV1Api')).toBeUndefined();
    expect(newSchema.getType('UserV1')).toBeDefined();
  });
  it('replaces all occurrences of multiple substrings in a type', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        api_user_v1_api: ApiUserV1Api!
      }

      type ApiUserV1Api {
        id: ID!
      }
    `);
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: 'Api|V1(.*?)',
          },
          to: {
            type: '$1',
          },
          useRegExpForTypes: true,
          regExpFlags: 'g',
        },
      ],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);

    expect(newSchema.getType('ApiUserV1Api')).toBeUndefined();
    expect(newSchema.getType('User')).toBeDefined();
  });
  it('replaces all occurrences of a substring in a field', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        api_user_v1_api: ApiUserV1Api!
      }

      type ApiUserV1Api {
        id: ID!
      }
    `);
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: 'Query',
            field: 'api_|_api(.*?)',
          },
          to: {
            type: 'Query',
            field: '$1',
          },
          useRegExpForFields: true,
          regExpFlags: 'g',
        },
      ],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.api_user_v1_api).toBeUndefined();
    expect(fieldMap.user_v1).toBeDefined();
  });
  it('replaces all occurrences of multiple substrings in a field', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        api_user_v1_api: ApiUserV1Api!
      }

      type ApiUserV1Api {
        id: ID!
      }
    `);
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: 'Query',
            field: 'api_|_api|v1_|_v1(.*?)',
          },
          to: {
            type: 'Query',
            field: '$1',
          },
          useRegExpForFields: true,
          regExpFlags: 'g',
        },
      ],
    });

    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.api_user_v1_api).toBeUndefined();
    expect(fieldMap.user).toBeDefined();
  });
  it('affects only a specified type', async () => {
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: 'Query',
            field: 'o(.*)',
          },
          to: {
            type: 'Query',
            field: '$1',
          },
          useRegExpForFields: true,
        },
      ],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.my_node).toBeUndefined();
    expect(fieldMap.my_nde).toBeDefined();
    expect(fieldMap.my_book).toBeUndefined();
    expect(fieldMap.my_bok).toBeDefined();

    const myUserType = newSchema.getType('MyUser') as GraphQLObjectType;
    const myUserFields = myUserType.getFields();

    expect(myUserFields.id).toBeDefined();

    const myBookType = newSchema.getType('MyBook') as GraphQLObjectType;
    const myBookFields = myBookType.getFields();

    expect(myBookFields.id).toBeDefined();
  });
  it('affects specified field arguments', async () => {
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: 'Query',
            field: 'profile',
            argument: 'profile_id',
          },
          to: {
            type: 'Query',
            field: 'profile',
            argument: 'profileId',
          },
        },
      ],
    });

    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.profile.args.find(a => a.name === 'role')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profile_id')).toBeUndefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profileId')).toBeDefined();

    expect(fieldMap.profile.args.find(a => a.name === 'another_argument')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'some_argument')).toBeDefined();
  });
  it('affects specified field match argument', async () => {
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: 'Query',
            field: 'profile',
            argument: '(profile)_(id)',
          },
          to: {
            type: 'Query',
            field: 'profile',
            argument: '$1Id',
          },
          useRegExpForArguments: true,
        },
      ],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);
    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.profile.args.find(a => a.name === 'role')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profile_id')).toBeUndefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profileId')).toBeDefined();

    expect(fieldMap.profile.args.find(a => a.name === 'another_argument')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'some_argument')).toBeDefined();
  });
  it('affects only specified matched field and matched argument', async () => {
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: 'Query',
            field: 'profile',
            argument: '(profile)_(id)',
          },
          to: {
            type: 'Query',
            field: 'profile',
            argument: '$1Id',
          },
          useRegExpForArguments: true,
        },
      ],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);
    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.profile.args.find(a => a.name === 'role')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profile_id')).toBeUndefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profileId')).toBeDefined();

    expect(fieldMap.profile.args.find(a => a.name === 'another_argument')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'some_argument')).toBeDefined();
  });
  it('affects only specified match type and match field argument', async () => {
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: '(.uer.)',
            field: '(.rofil.)',
            argument: 'profile_id',
          },
          to: {
            type: '$1',
            field: '$1',
            argument: 'profileId',
          },
          useRegExpForTypes: true,
          useRegExpForFields: true,
        },
      ],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.profile.args.find(a => a.name === 'role')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profile_id')).toBeUndefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profileId')).toBeDefined();

    expect(fieldMap.profile.args.find(a => a.name === 'another_argument')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'some_argument')).toBeDefined();
  });
  it('affects only specified match type, field and argument', async () => {
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: '(.uer.)',
            field: '(.rofil.)',
            argument: '(.*)_id',
          },
          to: {
            type: '$1',
            field: '$1',
            argument: '$1Id',
          },
          useRegExpForTypes: true,
          useRegExpForFields: true,
          useRegExpForArguments: true,
        },
      ],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);
    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.profile.args.find(a => a.name === 'role')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profile_id')).toBeUndefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profileId')).toBeDefined();

    expect(fieldMap.profile.args.find(a => a.name === 'another_argument')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'some_argument')).toBeDefined();
  });
  it('resolves the field correctly with renamed argument', async () => {
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            type: '(.uer.)',
            field: '(.rofil.)',
            argument: '(.*)_id',
          },
          to: {
            type: '$1',
            field: '$1',
            argument: '$1Id',
          },
          useRegExpForTypes: true,
          useRegExpForFields: true,
          useRegExpForArguments: true,
        },
      ],
    });
    const executor = composeAndGetExecutor([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);
    const result = await executor({
      query: /* GraphQL */ `
        {
          profile(profileId: "abc123") {
            id
          }
        }
      `,
    });

    expect(result).toMatchObject({ profile: { id: 'profile_abc123' } });
  });
  it('affects only field argument only if type and field are specified', async () => {
    const transform = createRenameTransform({
      renames: [
        {
          from: {
            argument: 'profile_id',
          },
          to: {
            argument: 'profileId',
          },
        },
      ],
    });

    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transform],
      },
    ]);

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.profile.args.find(a => a.name === 'role')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profile_id')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profileId')).toBeUndefined();
  });

  it('renames the scalars', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        scalar RandomInt

        type SomeEntity {
          id: RandomInt!
          name: String!
        }

        type Query {
          getSomeEntityById(id: RandomInt!): SomeEntity
        }
      `,
      resolvers: {},
    });
    const transforms = createRenameTransform({
      renames: [
        {
          from: {
            argument: '(.*)',
            field: '(.*)',
            type: '(.*)',
          },
          to: {
            argument: 'MyPrefix_$1',
            field: 'MyPrefix_$1',
            type: 'MyPrefix_$1',
          },
          useRegExpForArguments: true,
          useRegExpForFields: true,
          useRegExpForTypes: true,
        },
      ],
    });

    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transforms],
      },
    ]);
    // Check types
    expect(newSchema.getType('SomeEntity')).toBeUndefined();
    expect(newSchema.getType('MyPrefix_SomeEntity')).toBeDefined();
    expect(newSchema.getType('getSomeEntityById')).toBeUndefined();
    expect(newSchema.getType('MyPrefix_RandomInt')).toBeDefined();
    // Check fields
    expect(
      (newSchema.getType('MyPrefix_SomeEntity') as any)._fields.id.type.ofType.toString(),
    ).toBe('MyPrefix_RandomInt');
    // Check arguments
    expect(
      (newSchema.getQueryType() as any)._fields.getSomeEntityById.args[0].type.ofType.toString(),
    ).toBe('MyPrefix_RandomInt');
    expect(newSchema.getType('MyPrefix_RandomInt')).toBeDefined();
  });

  it('renames the default scalars if configured', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        scalar UUID

        type SomeEntity {
          id: UUID!
          name: String!
        }

        type Query {
          getSomeEntityById(id: UUID!): SomeEntity
        }
      `,
      resolvers: {},
    });
    const transforms = createRenameTransform({
      renames: [
        {
          from: {
            argument: '(.*)',
            field: '(.*)',
            type: '(.*)',
          },
          to: {
            argument: 'MyPrefix_$1',
            field: 'MyPrefix_$1',
            type: 'MyPrefix_$1',
          },
          useRegExpForArguments: true,
          useRegExpForFields: true,
          useRegExpForTypes: true,
          includeDefaults: true,
        },
      ],
    });

    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transforms],
      },
    ]);

    // Check types
    expect(newSchema.getType('SomeEntity')).toBeUndefined();
    expect(newSchema.getType('MyPrefix_SomeEntity')).toBeDefined();
    expect(newSchema.getType('getSomeEntityById')).toBeUndefined();
    expect(newSchema.getType('MyPrefix_UUID')).toBeDefined();
    // Check fields
    expect(
      (newSchema.getType('MyPrefix_SomeEntity') as any)._fields.id.type.ofType.toString(),
    ).toBe('MyPrefix_UUID');
    // Check arguments
    expect(
      (newSchema.getQueryType() as any)._fields.getSomeEntityById.args[0].type.ofType.toString(),
    ).toBe('MyPrefix_UUID');
    expect(newSchema.getType('MyPrefix_UUID')).toBeDefined();
  });

  it('applies all defined rules to fields', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          User_GetCartsForUser: UserGetCartsResponse!
        }

        type UserGetCartsResponse {
          id: ID!
          amount: Int!
        }
      `,
      resolvers: {
        Query: {
          User_GetCartsForUser: () => ({ id: 'abc123433', amount: 0 }),
        },
      },
    });
    const transforms = createRenameTransform({
      renames: [
        {
          from: {
            type: 'Query',
            field: '([A-Za-z]+)_(.*)', // -> remove prefix
          },
          to: {
            type: 'Query',
            field: '$2',
          },
          useRegExpForFields: true,
        },
        {
          from: {
            type: 'Query',
            field: '(.*)(ForUser)', // -> remove suffix
          },
          to: {
            type: 'Query',
            field: '$1',
          },
          useRegExpForFields: true,
        },
        {
          from: {
            type: 'Query',
            field: 'Get(.*)', // -> remove verb
          },
          to: {
            type: 'Query',
            field: '$1',
          },
          useRegExpForFields: true,
        },
      ],
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [transforms],
      },
    ]);
    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();
    expect(fieldMap.User_GetCartsForUser).toBeUndefined();
    expect(fieldMap.Carts).toBeDefined();
  });
});

describe('rewriteConnectArgReferences __typename one-pass', () => {
  it('does not double-rewrite FooBar->Foo then Foo->Bar', async () => {
    const { rewriteConnectArgReferences } = await import('../../src/transforms/utils.js');
    const typeRenameMap = new Map([
      ['FooBar', 'Foo'],
      ['Foo', 'Bar'],
    ]);
    const rewritten = rewriteConnectArgReferences(
      {
        connect: [
          {
            selection: '{ __typename: $("FooBar"), id } { __typename: $("Foo"), name }',
          },
        ],
      },
      new Map(),
      undefined,
      typeRenameMap,
    );
    const selection = rewritten!.connect[0].selection as string;
    expect(selection).toContain('__typename: $("Foo")');
    expect(selection).toContain('__typename: $("Bar")');
    expect(selection).not.toMatch(/__typename: \$\("FooBar"\)/);
    // FooBar must become Foo, not chain into Bar
    expect(selection).toMatch(/__typename: \$\("Foo"\), id/);
  });
});

describe('rewriteConnectArgReferences @thrift__rpc', () => {
  it('rewrites $args in thrift__rpc args/selection without requiring @connect', async () => {
    const { rewriteConnectArgReferences } = await import('../../src/transforms/utils.js');
    const rewritten = rewriteConnectArgReferences(
      {
        thrift__rpc: [
          {
            function: 'add',
            args: '1(struct): $args.request {\n  1(i32): left\n  2(i32): right\n}',
            selection: '$(i32)',
            messageType: 'CALL',
          },
        ],
      },
      new Map([['request', 'input']]),
    );
    const rpc = rewritten!.thrift__rpc[0];
    expect(rpc.args).toContain('$args.input');
    expect(rpc.args).not.toMatch(/\$args\.request\b/);
    expect(rpc.selection).toBe('$(i32)');
  });

  it('does not rewrite $args.requestId when renaming request', async () => {
    const { rewriteConnectArgReferences } = await import('../../src/transforms/utils.js');
    const rewritten = rewriteConnectArgReferences(
      {
        thrift__rpc: [
          {
            function: 'lookup',
            args: '1(i32): $args.request\n2(string): $args.requestId',
            selection: '$(i32)',
          },
        ],
      },
      new Map([['request', 'input']]),
    );
    const args = rewritten!.thrift__rpc[0].args as string;
    expect(args).toContain('$args.input');
    expect(args).toContain('$args.requestId');
    expect(args).not.toMatch(/\$args\.request\b/);
  });

  it('preserves quoted map lookup keys while rewriting real $args refs', async () => {
    const { rewriteConnectArgReferences } = await import('../../src/transforms/utils.js');
    const rewritten = rewriteConnectArgReferences(
      {
        thrift__rpc: [
          {
            function: 'lookup',
            args: '1(string): $args.request',
            selection: 'value: 1(map<string, i32>)->get("$args.request")',
          },
        ],
      },
      new Map([['request', 'input']]),
    );
    const rpc = rewritten!.thrift__rpc[0];
    expect(rpc.args).toContain('$args.input');
    expect(rpc.selection).toContain('->get("$args.request")');
    expect(rpc.selection).not.toContain('->get("$args.input")');
  });

  it('rewrites $args in HTTP paths that contain apostrophes', async () => {
    const { rewriteConnectArgReferences } = await import('../../src/transforms/utils.js');
    const rewritten = rewriteConnectArgReferences(
      {
        connect: [
          {
            http: { GET: "/authors/O'Reilly/{$args.request}" },
            selection: 'id',
          },
        ],
      },
      new Map([['request', 'input']]),
    );
    expect(rewritten!.connect[0].http.GET).toBe("/authors/O'Reilly/{$args.input}");
  });
});

describe('Neo4j identity helpers', () => {
  it('stamps @node(labels:)/@plural and @alias; rewrites @cypher $args', async () => {
    const {
      ensureNeo4jNodeLabels,
      ensureNeo4jPlural,
      ensureNeo4jTypeIdentity,
      ensureNeo4jFieldAlias,
      neo4jDefaultPlural,
      rewriteNeo4jCypherArgReferences,
      rewriteNeo4jRelationshipPropertiesRefs,
    } = await import('../../src/transforms/neo4j-identity.js');
    expect(neo4jDefaultPlural('Movie')).toBe('movies');
    expect(neo4jDefaultPlural('Person')).toBe('people');
    expect(neo4jDefaultPlural('_Movie')).toBe('_movies');
    expect(ensureNeo4jNodeLabels({ node: [{}] }, 'Movie')).toEqual({
      node: [{ labels: ['Movie'] }],
    });
    expect(ensureNeo4jNodeLabels({ node: [{ labels: ['Film'] }] }, 'Movie')).toEqual({
      node: [{ labels: ['Film'] }],
    });
    // Singleton string from getDirectiveExtensions without schema coercion.
    expect(ensureNeo4jNodeLabels({ node: [{ labels: 'Feature' as any }] }, 'Movie')).toEqual({
      node: [{ labels: ['Feature'] }],
    });
    expect(ensureNeo4jTypeIdentity({ node: [{ subgraph: 'Movies' }] }, 'Movie')).toEqual({
      node: [{ subgraph: 'Movies', labels: ['Movie'] }],
      plural: [{ subgraph: 'Movies', value: 'movies' }],
    });
    // Plural follows original GraphQL type name, not DB labels.
    expect(
      ensureNeo4jPlural({ node: [{ subgraph: 'Movies', labels: ['Feature'] }] }, 'Movie'),
    ).toEqual({
      node: [{ subgraph: 'Movies', labels: ['Feature'] }],
      plural: [{ subgraph: 'Movies', value: 'movies' }],
    });
    expect(
      ensureNeo4jPlural({ node: [{ labels: ['Movie'] }], plural: [{ value: 'cinemas' }] }, 'Film'),
    ).toEqual({
      node: [{ labels: ['Movie'] }],
      plural: [{ value: 'cinemas' }],
    });
    expect(ensureNeo4jFieldAlias({}, 'title', { isNeo4jModelField: true })?.alias?.[0]).toEqual({
      property: 'title',
    });
    expect(
      ensureNeo4jFieldAlias({ relationship: [{ type: 'ACTED_IN' }] }, 'actors', {
        isNeo4jModelField: true,
      }),
    ).toEqual({ relationship: [{ type: 'ACTED_IN' }] });
    const rewritten = rewriteNeo4jCypherArgReferences(
      {
        cypher: [
          {
            statement:
              'MATCH (this) WHERE this.title = $title AND $jwt.sub IS NOT NULL RETURN this',
            columnName: 'this',
          },
        ],
      },
      new Map([['title', 'needle']]),
    );
    expect(rewritten!.cypher[0].statement).toContain('$needle');
    expect(rewritten!.cypher[0].statement).toContain('$jwt.sub');
    expect(rewritten!.cypher[0].statement).not.toMatch(/\$title\b/);
  });

  it('rewrites @cypher params outside string literals only', async () => {
    const { rewriteNeo4jCypherArgReferences } =
      await import('../../src/transforms/neo4j-identity.js');
    const rewritten = rewriteNeo4jCypherArgReferences(
      {
        cypher: [
          {
            statement: "RETURN CASE WHEN $title = '$title' THEN 1 ELSE 0 END AS n",
            columnName: 'n',
          },
        ],
      },
      new Map([['title', 'needle']]),
    );
    expect(rewritten!.cypher[0].statement).toBe(
      "RETURN CASE WHEN $needle = '$title' THEN 1 ELSE 0 END AS n",
    );
  });

  it('rewrites @cypher params after escaped quotes and comments', async () => {
    const { rewriteNeo4jCypherArgReferences } =
      await import('../../src/transforms/neo4j-identity.js');
    const rewritten = rewriteNeo4jCypherArgReferences(
      {
        cypher: [
          {
            statement: `// user's search
WITH 'it\\'s' AS text /* keep $title here */ RETURN $title AS n`,
            columnName: 'n',
          },
        ],
      },
      new Map([['title', 'needle']]),
    );
    expect(rewritten!.cypher[0].statement).toContain('$needle');
    expect(rewritten!.cypher[0].statement).toMatch(/\/\* keep \$title here \*\//);
    expect(rewritten!.cypher[0].statement).not.toMatch(/RETURN \$title\b/);
  });

  it('rewrites @cypher params after CR line comments and backtick params', async () => {
    const { rewriteNeo4jCypherArgReferences, rewriteCypherParamNames } =
      await import('../../src/transforms/neo4j-identity.js');
    const withCr = rewriteNeo4jCypherArgReferences(
      {
        cypher: [
          {
            statement: '// note\rRETURN $title AS n',
            columnName: 'n',
          },
        ],
      },
      new Map([['title', 'needle']]),
    );
    expect(withCr!.cypher[0].statement).toBe('// note\rRETURN $needle AS n');
    expect(rewriteCypherParamNames('RETURN $`title` AS n', new Map([['title', 'needle']]))).toBe(
      'RETURN $needle AS n',
    );
    // Trivia between `$` and the name is preserved when rewriting.
    expect(rewriteCypherParamNames('RETURN $ `title` AS n', new Map([['title', 'needle']]))).toBe(
      'RETURN $ needle AS n',
    );
    expect(
      rewriteCypherParamNames('RETURN $\u00A0`title` AS n', new Map([['title', 'needle']])),
    ).toBe('RETURN $\u00A0needle AS n');
    expect(
      rewriteCypherParamNames('RETURN $ /* note */ `title` AS n', new Map([['title', 'needle']])),
    ).toBe('RETURN $ /* note */ needle AS n');
    // Dynamic label ANY/ALL after `$` are operators, not parameters.
    expect(
      rewriteCypherParamNames(
        'MATCH (m:$ any($labels)) RETURN count(m) + $any AS n',
        new Map([['any', 'needle']]),
      ),
    ).toBe('MATCH (m:$ any($labels)) RETURN count(m) + $needle AS n');
    // Comments between ANY/ALL and `(` stay operators (preserve trivia).
    expect(
      rewriteCypherParamNames(
        'MATCH (m:$any /* note */ ($labels)) RETURN $any AS n',
        new Map([['any', 'needle']]),
      ),
    ).toBe('MATCH (m:$any /* note */ ($labels)) RETURN $needle AS n');
    // Em space (U+2003) after ANY/ALL stays an operator; `$any` param still renames.
    expect(
      rewriteCypherParamNames(
        'MATCH (m:$any\u2003($labels)) RETURN $any AS n',
        new Map([['any', 'needle']]),
      ),
    ).toBe('MATCH (m:$any\u2003($labels)) RETURN $needle AS n');
    // Cypher lexer file-separator whitespace (U+001C–U+001F) is trivia too.
    expect(
      rewriteCypherParamNames(
        'MATCH (m:$any\u001C($labels)) RETURN $any AS n',
        new Map([['any', 'needle']]),
      ),
    ).toBe('MATCH (m:$any\u001C($labels)) RETURN $needle AS n');
    expect(rewriteCypherParamNames('RETURN $\u001Cany AS n', new Map([['any', 'needle']]))).toBe(
      'RETURN $\u001Cneedle AS n',
    );
    // Standalone backtick identifiers are not parameters.
    expect(rewriteCypherParamNames('RETURN `title` AS n', new Map([['title', 'needle']]))).toBe(
      'RETURN `title` AS n',
    );
  });

  it('does not stamp @alias on Neo4j input fields', async () => {
    const { ensureNeo4jFieldAlias } = await import('../../src/transforms/neo4j-identity.js');
    expect(
      ensureNeo4jFieldAlias({}, 'search_term', {
        allowNonModelPropertyAlias: true,
        parentIsObjectOrInterface: false,
      }),
    ).toEqual({});
    expect(
      ensureNeo4jFieldAlias({}, 'total_count', {
        allowNonModelPropertyAlias: true,
        parentIsObjectOrInterface: true,
      })?.alias?.[0]?.property,
    ).toBe('total_count');
  });

  it('rewrites @relationship(properties:) through type rename map', async () => {
    const { rewriteNeo4jRelationshipPropertiesRefs } =
      await import('../../src/transforms/neo4j-identity.js');
    const rewritten = rewriteNeo4jRelationshipPropertiesRefs(
      {
        relationship: [
          { type: 'ACTED_IN', direction: 'IN', properties: 'ActedIn', subgraph: 'Movies' },
        ],
      },
      new Map([['ActedIn', 'Credit']]),
    );
    expect(rewritten!.relationship[0]).toEqual({
      type: 'ACTED_IN',
      direction: 'IN',
      properties: 'Credit',
      subgraph: 'Movies',
    });
  });
});

describe('rewriteConnectArgReferences @mongo__*', () => {
  it('rewrites $args in mongo__find without requiring @connect', async () => {
    const { rewriteConnectArgReferences } = await import('../../src/transforms/utils.js');
    const rewritten = rewriteConnectArgReferences(
      {
        mongo__find: [
          {
            collection: 'users',
            query: '$args.criteria',
            sort: '$args.order',
            selection: 'id: _id\nname: name',
          },
        ],
      },
      new Map([
        ['criteria', 'query'],
        ['order', 'sort'],
      ]),
    );
    const mongo = rewritten!.mongo__find[0];
    expect(mongo.query).toBe('$args.query');
    expect(mongo.sort).toBe('$args.sort');
    expect(mongo.selection).toBe('id: _id\nname: name');
  });

  it('does not rewrite $args.queryInput when renaming query', async () => {
    const { rewriteConnectArgReferences } = await import('../../src/transforms/utils.js');
    const rewritten = rewriteConnectArgReferences(
      {
        mongo__findOne: [
          {
            collection: 'users',
            query: '_id: $args.query\nmeta: $args.queryInput',
          },
        ],
      },
      new Map([['query', 'criteria']]),
    );
    const query = rewritten!.mongo__findOne[0].query as string;
    expect(query).toContain('$args.criteria');
    expect(query).toContain('$args.queryInput');
    expect(query).not.toMatch(/\$args\.query\b/);
  });

  it('rewrites $this field picks via fieldRenameMap', async () => {
    const { rewriteConnectArgReferences } = await import('../../src/transforms/utils.js');
    const rewritten = rewriteConnectArgReferences(
      {
        mongo__findOne: [
          {
            collection: 'users',
            query: '_id: $this.authorId',
            selection: 'id: _id',
          },
        ],
      },
      new Map(),
      new Map([['authorId', 'writerId']]),
    );
    expect(rewritten!.mongo__findOne[0].query).toBe('_id: $this.writerId');
  });

  it('applies each $this rename once without cascading map entries', async () => {
    const { rewriteConnectArgReferences } = await import('../../src/transforms/utils.js');
    const rewritten = rewriteConnectArgReferences(
      {
        mongo__findOne: [
          {
            collection: 'users',
            query: '_id: $this.primaryId',
            selection: 'primaryId',
          },
        ],
      },
      new Map(),
      new Map([
        ['primaryId', 'secondaryId'],
        ['secondaryId', 'backupId'],
      ]),
    );
    expect(rewritten!.mongo__findOne[0].query).toBe('_id: $this.secondaryId');
    expect(rewritten!.mongo__findOne[0].selection).toBe('secondaryId');
  });

  it('rewrites $this after # comments that contain apostrophes', async () => {
    const { rewriteConnectArgReferences } = await import('../../src/transforms/utils.js');
    const rewritten = rewriteConnectArgReferences(
      {
        mongo__findOne: [
          {
            collection: 'users',
            query: "# author's ID\n_id: $this.author_id",
          },
        ],
      },
      new Map(),
      new Map([['author_id', 'authorId']]),
    );
    expect(rewritten!.mongo__findOne[0].query).toBe("# author's ID\n_id: $this.authorId");
  });

  it('does not rewrite $this picks inside quoted string literals', async () => {
    const { rewriteConnectArgReferences } = await import('../../src/transforms/utils.js');
    const rewritten = rewriteConnectArgReferences(
      {
        mongo__findOne: [
          {
            collection: 'users',
            query: '_id: $this.authorId',
            selection: 'note: "see $this.authorId"',
          },
        ],
      },
      new Map(),
      new Map([['authorId', 'writerId']]),
    );
    expect(rewritten!.mongo__findOne[0].query).toBe('_id: $this.writerId');
    expect(rewritten!.mongo__findOne[0].selection).toBe('note: "see $this.authorId"');
  });

  it('does not apply selection-pick rewrites inside Mongo query string literals', async () => {
    const { rewriteConnectArgReferences } = await import('../../src/transforms/utils.js');
    const rewritten = rewriteConnectArgReferences(
      {
        mongo__findOne: [
          {
            collection: 'users',
            query: 'status: " old_name "',
            selection: 'old_name',
          },
        ],
      },
      new Map(),
      new Map([['old_name', 'oldName']]),
    );
    expect(rewritten!.mongo__findOne[0].query).toBe('status: " old_name "');
    expect(rewritten!.mongo__findOne[0].selection).toBe('oldName');
  });

  it('preserves quoted literals inside Mongo selection while renaming bare picks', async () => {
    const { rewriteConnectArgReferences } = await import('../../src/transforms/utils.js');
    const rewritten = rewriteConnectArgReferences(
      {
        mongo__findOne: [
          {
            collection: 'users',
            selection: 'old_name\nnote: " old_name "',
          },
        ],
      },
      new Map(),
      new Map([['old_name', 'oldName']]),
    );
    expect(rewritten!.mongo__findOne[0].selection).toBe('oldName\nnote: " old_name "');
  });
});
