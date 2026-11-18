import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  type GraphQLOutputType,
  type GraphQLScalarType,
} from 'graphql';
import { GraphQLJSON } from 'graphql-scalars';
import { GraphQLMongoID } from '@graphql-mesh/transport-mongo';

/**
 * Map a Mongoose / BSON path instance type name to a GraphQL output type.
 * First slice keeps Decimal128 as String and Mixed as JSON.
 */
export function mapMongoPathToGraphQL(
  instance: string,
  opts?: { asId?: boolean },
): GraphQLOutputType | GraphQLScalarType {
  if (opts?.asId || instance === 'ObjectID' || instance === 'ObjectId') {
    return GraphQLMongoID;
  }
  switch (instance) {
    case 'String':
      return GraphQLString;
    case 'Number':
      return GraphQLFloat;
    case 'Decimal128':
      return GraphQLString;
    case 'Boolean':
      return GraphQLBoolean;
    case 'Date':
      return GraphQLString;
    case 'Buffer':
      return GraphQLString;
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
