import { GraphQLScalarType, Kind, type GraphQLScalarTypeConfig } from 'graphql';

/**
 * BSON Decimal128 as a GraphQL scalar (string wire format).
 * graphql-scalars has no Decimal128; keep this local to `@omnigraph/mongo`.
 */
const config: GraphQLScalarTypeConfig<string, string> = {
  name: 'Decimal128',
  description: 'BSON Decimal128 value. Serialized and parsed as a decimal string (e.g. `"12.50"`).',
  serialize(value: unknown): string {
    if (value == null) {
      throw new TypeError('Decimal128 cannot represent null/undefined');
    }
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object' && value !== null && 'toString' in value) {
      return String((value as { toString: () => string }).toString());
    }
    throw new TypeError(`Decimal128 cannot represent value: ${String(value)}`);
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    throw new TypeError(`Decimal128 cannot represent non-decimal value: ${String(value)}`);
  },
  parseLiteral(ast): string {
    if (ast.kind === Kind.STRING || ast.kind === Kind.FLOAT || ast.kind === Kind.INT) {
      return ast.value;
    }
    throw new TypeError(`Decimal128 cannot represent non-decimal literal: ${ast.kind}`);
  },
};

export const GraphQLDecimal128 = new GraphQLScalarType(config);
