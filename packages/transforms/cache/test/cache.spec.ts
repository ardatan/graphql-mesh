import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';
import { addResolveFunctionsToSchema } from 'graphql-tools-fork';
import { GraphQLSchema, buildSchema } from 'graphql';
import cacheTransform from '../src';

const MOCK_DATA = [
  {
    id: 1,
    username: 'dotansimha',
    email: 'dotan@mail.com',
    profile: {
      name: 'Dotan',
      age: 10
    }
  },
  {
    id: 2,
    username: 'ardatan',
    email: 'arda@mail.com',
    profile: {
      name: 'Ardatan',
      age: 12
    }
  },
  {
    id: 3,
    username: 'kamilkisiela',
    email: 'kamil@mail.com',
    profile: {
      name: 'Kamil',
      age: 5
    }
  }
];

const spies = {
  Query: {
    user: jest.fn().mockImplementation((_, { id }) => {
      return MOCK_DATA.find(u => u.id === id);
    }),
    users: jest.fn().mockImplementation((_, { filter }) => {
      if (!filter) {
        return MOCK_DATA;
      }

      return MOCK_DATA.find(u => {
        if (filter.email && u.email === filter.email) {
          return true;
        }
        if (filter.username && u.username === filter.username) {
          return true;
        }
        if (filter.name && u.profile.name === filter.name) {
          return true;
        }
        if (filter.age && u.profile.age === filter.age) {
          return true;
        }

        return false;
      });
    })
  }
};

describe('cache', () => {
  let schema: GraphQLSchema;

  beforeEach(() => {
    const baseSchema = buildSchema(/* GraphQL */ `
      type Query {
        user(id: ID!): User!
        users(filter: SearchUsersInput): [User!]!
      }

      input SearchUsersInput {
        username: String
        email: String
        name: String
        age: String
      }

      type User {
        id: ID!
        username: String!
        email: String!
        profile: Profile!
      }

      type Profile {
        name: String!
        age: Int!
      }
    `);

    schema = addResolveFunctionsToSchema({
      schema: baseSchema,
      resolvers: spies
    });

    spies.Query.user.mockClear();
    spies.Query.users.mockClear();
  });

  describe('Resolvers Composition', () => {
    const cache = new InMemoryLRUCache();

    it('should replace resolvers correctly with a specific type and field', async () => {
      expect(schema.getQueryType()?.getFields()['user'].resolve).toBe(
        spies.Query.user
      );

      const modifiedSchema = await cacheTransform({
        schema,
        cache,
        config: [
          {
            field: 'Query.user'
          }
        ]
      });

      expect(
        modifiedSchema.getQueryType()?.getFields()['user'].resolve
      ).not.toBe(spies.Query.user);
      expect(modifiedSchema.getQueryType()?.getFields()['users'].resolve).toBe(
        spies.Query.users
      );
    });

    it('should replace resolvers correctly with a wildcard', async () => {
      expect(schema.getQueryType()?.getFields()['user'].resolve).toBe(
        spies.Query.user
      );
      expect(schema.getQueryType()?.getFields()['users'].resolve).toBe(
        spies.Query.users
      );

      const modifiedSchema = await cacheTransform({
        schema,
        cache,
        config: [
          {
            field: 'Query.*'
          }
        ]
      });

      expect(
        modifiedSchema.getQueryType()?.getFields()['user'].resolve
      ).not.toBe(spies.Query.user);
      expect(
        modifiedSchema.getQueryType()?.getFields()['users'].resolve
      ).not.toBe(spies.Query.users);
    });
  });
});
