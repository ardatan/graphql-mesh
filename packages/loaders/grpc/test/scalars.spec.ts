import { getGraphQLScalarForGrpc, isGrpcScalar } from '../src/scalars.js';

describe.each<[string, string]>([
  ['bool', 'Boolean'],
  ['bytes', 'Byte'],
  ['double', 'Float'],
  ['fixed32', 'Int'],
  ['fixed64', 'BigInt'],
  ['float', 'Float'],
  ['int32', 'Int'],
  ['int64', 'BigInt'],
  ['sfixed32', 'Int'],
  ['sfixed64', 'BigInt'],
  ['sint32', 'Int'],
  ['sint64', 'BigInt'],
  ['string', 'String'],
  ['uint32', 'UnsignedInt'],
  ['uint64', 'BigInt'],
])('Valid Scalars', (scalarType, scalarGqlType) => {
  test(`getGraphQLScalar should return the proper graphql scalar for ${scalarType}`, () => {
    expect(getGraphQLScalarForGrpc(scalarType)).toBe(scalarGqlType);
  });
  test(`isScalarType should return true for ${scalarType}`, () => {
    expect(isGrpcScalar(scalarType)).toBe(true);
  });
});

describe('Invalid Scalars', () => {
  test('getGraphQLScalar should throw an error', () => {
    expect(() => getGraphQLScalarForGrpc('randomType')).toThrow(
      /Could not find GraphQL Scalar for type/,
    );
  });
  test('isScalarType should return false for none scalars', () => {
    expect(isGrpcScalar('randomType')).toBe(false);
  });
});
