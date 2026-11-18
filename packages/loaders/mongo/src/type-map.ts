import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  type GraphQLOutputType,
  type GraphQLScalarType,
} from 'graphql';
import {
  GraphQLByte,
  GraphQLDateTime,
  GraphQLJSON,
  GraphQLObjectID,
} from 'graphql-scalars';

/**
 * Map a Mongoose / BSON path instance type name to a GraphQL output type.
 * Prefer graphql-scalars (`ObjectID`, `DateTime`, `Byte`, `JSON`) over custom Mesh scalars.
 * Decimal128 has no graphql-scalars equivalent yet -> String.
 */
export function mapMongoPathToGraphQL(
  instance: string,
  opts?: { asId?: boolean },
): GraphQLOutputType | GraphQLScalarType {
  if (opts?.asId || instance === 'ObjectID' || instance === 'ObjectId') {
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
