import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  type GraphQLOutputType,
  type GraphQLScalarType,
} from 'graphql';
import { GraphQLByte, GraphQLDateTime, GraphQLJSON, GraphQLObjectID } from 'graphql-scalars';

/**
 * Map a Mongoose / BSON path instance type name to a GraphQL output type.
 * Sole document PK (`_id` / asId) uses GraphQL `ID` (federation-friendly).
 * Other ObjectId paths keep graphql-scalars `ObjectID`.
 */
export function mapMongoPathToGraphQL(
  instance: string,
  opts?: { asId?: boolean },
): GraphQLOutputType | GraphQLScalarType {
  if (opts?.asId) {
    return GraphQLID;
  }
  if (instance === 'ObjectID' || instance === 'ObjectId') {
    return GraphQLObjectID;
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
