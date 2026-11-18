import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLString,
  type GraphQLScalarType,
} from 'graphql';
import { GraphQLBigInt, GraphQLDate, GraphQLDateTime, GraphQLJSON } from 'graphql-scalars';

export function mapSqlTypeToGraphQL(
  dataType: string,
  opts?: { asId?: boolean },
): GraphQLScalarType {
  if (opts?.asId) {
    return GraphQLID;
  }
  const t = dataType.toUpperCase();
  if (t.includes('BOOL') || t === 'BIT') {
    return GraphQLBoolean;
  }
  // Avoid `INTERVAL` / similar false positives from a bare `includes('INT')`.
  if (
    /\b(BIG|SMALL|TINY|MEDIUM)?INT(EGER)?\b/.test(t) ||
    t === 'SERIAL' ||
    t === 'BIGSERIAL' ||
    t === 'INT2' ||
    t === 'INT4' ||
    t === 'INT8'
  ) {
    if (t.includes('BIG') || t.includes('UNSIGNED') || t === 'INT8' || t === 'BIGSERIAL') {
      return GraphQLBigInt as unknown as GraphQLScalarType;
    }
    return GraphQLInt;
  }
  if (
    t.includes('DOUBLE') ||
    t.includes('FLOAT') ||
    t.includes('REAL') ||
    t.includes('NUMERIC') ||
    t.includes('DECIMAL')
  ) {
    return GraphQLFloat;
  }
  if (t.includes('TIMESTAMP') || t.includes('DATETIME')) {
    return GraphQLDateTime as unknown as GraphQLScalarType;
  }
  if (t === 'DATE') {
    return GraphQLDate as unknown as GraphQLScalarType;
  }
  if (t.includes('JSON') || t.includes('JSONB')) {
    return GraphQLJSON as unknown as GraphQLScalarType;
  }
  if (t.includes('BLOB') || t.includes('BINARY') || t.includes('BYTEA')) {
    return GraphQLString;
  }
  return GraphQLString;
}
