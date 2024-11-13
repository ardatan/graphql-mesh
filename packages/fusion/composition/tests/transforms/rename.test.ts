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
