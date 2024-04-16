import { GraphQLError } from 'graphql';
import { createSchema } from 'graphql-yoga';

// data fixtures
const metadatas = [
  {
    id: '1',
    __typename: 'GeoLocation',
    name: 'Old Trafford, Greater Manchester, England',
    lat: 53.4621,
    lon: 2.2766,
  },
  { id: '2', __typename: 'SportsTeam', name: 'Manchester United', locationId: '1' },
  { id: '3', __typename: 'TelevisionSeries', name: 'Great British Baking Show', season: 7 },
  { id: '4', __typename: 'GeoLocation', name: 'Great Britain', lat: 55.3781, lon: 3.436 },
  { id: '5', __typename: 'GeoLocation', name: 'Argentina', lat: 38.4161, lon: 63.6167 },
];

const categories = [
  { id: '1', name: 'Sports' },
  { id: '2', name: 'Cooking' },
  { id: '3', name: 'Travel' },
];

export const metadataSchema = createSchema({
  typeDefs: /* GraphQL */ `
    type Category {
      id: ID!
      name: String!
    }

    interface Metadata {
      id: ID!
      name: String!
    }

    type GeoLocation implements Metadata {
      id: ID!
      name: String!
      lat: Float!
      lon: Float!
    }

    type SportsTeam implements Metadata {
      id: ID!
      name: String!
      location: GeoLocation
    }

    type TelevisionSeries implements Metadata {
      id: ID!
      name: String!
      season: Int
    }

    type Product {
      category: Category @deprecated(reason: "gateway access only") # @computed(selectionSet: "{ categoryId }")
      metadata: [Metadata] @deprecated(reason: "gateway access only") # @computed(selectionSet: "{ metadataIds }")
    }

    input ProductKey {
      categoryId: ID
      metadataIds: [ID!]
    }

    type Query {
      _products(keys: [ProductKey!]!): [Product]!
    }
  `,
  resolvers: {
    Query: {
      _products: (root, { keys }) => keys,
    },
    Product: {
      metadata(product) {
        return product.metadataIds
          ? product.metadataIds.map(
              (id: string) =>
                metadatas.find(m => m.id === id) ||
                new GraphQLError('Record not found', {
                  extensions: {
                    code: 'NOT_FOUND',
                  },
                }),
            )
          : null;
      },
      category(product) {
        return product.categoryId ? categories.find(c => c.id === product.categoryId) : null;
      },
    },
    SportsTeam: {
      location(team) {
        return (
          metadatas.find(m => m.id === team.locationId) ||
          new GraphQLError('Record not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          })
        );
      },
    },
  },
});
