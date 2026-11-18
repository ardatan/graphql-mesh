import { GraphQLBoolean, GraphQLInt, GraphQLString } from 'graphql';
import { GraphQLBigInt, GraphQLByte } from 'graphql-scalars';
import { mapSqlTypeToGraphQL } from '../src/type-map.js';

describe('mapSqlTypeToGraphQL', () => {
  it('preserves UNSIGNED after integer display-width → BigInt', () => {
    expect(mapSqlTypeToGraphQL('int(10) unsigned')).toBe(GraphQLBigInt);
    expect(mapSqlTypeToGraphQL('INT(11) UNSIGNED')).toBe(GraphQLBigInt);
    expect(mapSqlTypeToGraphQL('int(11)')).toBe(GraphQLInt);
  });

  it('maps MySQL BIT(1) to Boolean and wider BIT to Byte', () => {
    expect(mapSqlTypeToGraphQL('bit(1)')).toBe(GraphQLBoolean);
    expect(mapSqlTypeToGraphQL('bit(8)')).toBe(GraphQLByte);
  });

  it('maps Postgres bit / varbit (no width) to String', () => {
    expect(mapSqlTypeToGraphQL('bit')).toBe(GraphQLString);
    expect(mapSqlTypeToGraphQL('varbit')).toBe(GraphQLString);
    expect(mapSqlTypeToGraphQL('bit varying')).toBe(GraphQLString);
  });

  it('does not treat enum labels as binary types', () => {
    expect(mapSqlTypeToGraphQL("enum('BINARY','TEXT')")).toBe(GraphQLString);
  });
});
