import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  type GraphQLOutputType,
  type GraphQLScalarType,
} from 'graphql';
import { GraphQLByte, GraphQLDateTime, GraphQLJSON, GraphQLObjectID } from 'graphql-scalars';
import { GraphQLDecimal128 } from './scalars.js';

/**
 * Map a Mongoose / BSON path instance type name to a GraphQL output type.
 * BSON ObjectId (including document `_id` exposed as GraphQL `id`) uses
 * graphql-scalars `ObjectID`. Decimal128 uses the local `Decimal128` scalar.
 */
export function mapMongoPathToGraphQL(instance: string): GraphQLOutputType | GraphQLScalarType {
  if (instance === 'ObjectID' || instance === 'ObjectId') {
    return GraphQLObjectID;
  }
  switch (instance) {
    case 'String':
      return GraphQLString;
    case 'Number':
      return GraphQLFloat;
    case 'Decimal128':
      return GraphQLDecimal128;
    case 'Boolean':
      return GraphQLBoolean;
    case 'Date':
      return GraphQLDateTime;
    case 'Buffer':
      return GraphQLByte;
    case 'Mixed':
    case 'Array':
      return GraphQLJSON;
    case 'Map':
      return GraphQLJSON;
    case 'Int32':
      return GraphQLInt;
    case 'Double':
      return GraphQLFloat;
    default:
      return GraphQLJSON;
  }
}

export function mapMongoPathToList(inner: GraphQLOutputType): GraphQLOutputType {
  return new GraphQLList(inner);
}
