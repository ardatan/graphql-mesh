import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import type { RawSourceOutput } from '@graphql-mesh/types';
import { DefaultLogger, getInContextSDK } from '@graphql-mesh/utils';

describe('getInContextSDK key-based delegation', () => {
  const UserType = new GraphQLObjectType({
    name: 'User',
    fields: {
      id: { type: new GraphQLNonNull(GraphQLID) },
      name: { type: new GraphQLNonNull(GraphQLString) },
    },
  });

  function buildSource() {
    // `ids` is optional, so an arg-less call would be accepted and return a list.
    const usersByIds = jest.fn((_root: unknown, { ids }: { ids?: string[] }) =>
      (ids || []).map(id => ({ id, name: `User ${id}` })),
    );
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          usersByIds: {
            type: new GraphQLNonNull(new GraphQLList(UserType)),
            args: { ids: { type: new GraphQLList(new GraphQLNonNull(GraphQLID)) } },
            resolve: usersByIds,
          },
        },
      }),
    });
    const rawSource: RawSourceOutput = {
      name: 'users',
      schema,
      transforms: [],
      contextVariables: {},
      handler: {} as RawSourceOutput['handler'],
      batch: true,
      createProxyingResolver: () => undefined as any,
    };
    const inContextSDK = getInContextSDK(schema, [rawSource], new DefaultLogger('test'), []);
    return { inContextSDK, usersByIds };
  }

  // `resolve-additional-resolvers` passes `key = lodashGet(root, keyField)` and an
  // `argsFromKeys` that packs the keys under `keysArg`.
  const argsFromKeys = (keys: readonly string[]) => ({ ids: keys });
  const selectionSet = /* GraphQL */ `
    {
      id
      name
    }
  `;

  it('resolves to null when the key is null, without delegating', async () => {
    const { inContextSDK, usersByIds } = buildSource();

    const result = await inContextSDK.users.Query.usersByIds({
      root: { authorId: null },
      context: {},
      key: null,
      argsFromKeys,
      selectionSet,
    });

    expect(result).toBeNull();
    expect(usersByIds).not.toHaveBeenCalled();
  });

  it('resolves to null when the key is undefined, without delegating', async () => {
    const { inContextSDK, usersByIds } = buildSource();

    const result = await inContextSDK.users.Query.usersByIds({
      root: {},
      context: {},
      key: undefined,
      argsFromKeys,
      selectionSet,
    });

    expect(result).toBeNull();
    expect(usersByIds).not.toHaveBeenCalled();
  });

  it('still delegates with a non-null key (batch path)', async () => {
    const { inContextSDK, usersByIds } = buildSource();

    const result = await inContextSDK.users.Query.usersByIds({
      root: { authorId: '1' },
      context: {},
      key: '1',
      argsFromKeys,
      selectionSet,
    });

    expect(result).toEqual({ id: '1', name: 'User 1' });
    expect(usersByIds).toHaveBeenCalledTimes(1);
    expect(usersByIds.mock.calls[0][1]).toEqual({ ids: ['1'] });
  });
});
