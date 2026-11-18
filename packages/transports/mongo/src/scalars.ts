import { GraphQLScalarType, Kind, type GraphQLScalarTypeConfig } from 'graphql';
import { ObjectId } from 'mongodb';

const config: GraphQLScalarTypeConfig<string | ObjectId, string> = {
  name: 'MongoID',
  description: 'MongoDB ObjectId represented as a 24-char hex string',
  serialize(value) {
    if (value instanceof ObjectId) return value.toHexString();
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'toHexString' in value) {
      return (value as ObjectId).toHexString();
    }
    return String(value);
  },
  parseValue(value) {
    if (typeof value !== 'string') {
      throw new Error('MongoID must be a string');
    }
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new Error('MongoID must be a string');
    }
    return ast.value;
  },
};

export const GraphQLMongoID = new GraphQLScalarType(config);
