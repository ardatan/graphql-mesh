import { GraphQLScalarType, Kind, type ValueNode } from 'graphql';
import { Decimal128 } from 'mongodb';

/**
 * BSON Decimal128 scalar, cast rules aligned with Mongoose
 * (`lib/cast/decimal128.js`): string, number, Buffer/Uint8Array,
 * Extended JSON `{ $numberDecimal }`, or an existing Decimal128.
 * GraphQL wire format is a decimal string; runtime value is BSON Decimal128.
 */
function castDecimal128(value: unknown): Decimal128 {
  if (value == null) {
    throw new TypeError('Decimal128 cannot represent null/undefined');
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as any).$numberDecimal === 'string'
  ) {
    return Decimal128.fromString((value as { $numberDecimal: string }).$numberDecimal);
  }
  if (value instanceof Decimal128) {
    return value;
  }
  // Driver / mongoose instances sometimes fail `instanceof` across copies.
  if (
    typeof value === 'object' &&
    value !== null &&
    ((value as { _bsontype?: string })._bsontype === 'Decimal128' ||
      typeof (value as { toString?: () => string }).toString === 'function') &&
    String((value as { constructor?: { name?: string } }).constructor?.name) === 'Decimal128'
  ) {
    return Decimal128.fromString(String(value));
  }
  if (typeof value === 'string') {
    return Decimal128.fromString(value);
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    return new Decimal128(value);
  }
  if (typeof Uint8Array !== 'undefined' && value instanceof Uint8Array) {
    return new Decimal128(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Decimal128.fromString(String(value));
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { valueOf?: () => unknown }).valueOf === 'function'
  ) {
    const v = (value as { valueOf: () => unknown }).valueOf();
    if (typeof v === 'string') {
      return Decimal128.fromString(v);
    }
  }
  throw new TypeError(`Decimal128 cannot represent value: ${String(value)}`);
}

function serializeDecimal128(value: unknown): string {
  return castDecimal128(value).toString();
}

function parseLiteral(ast: ValueNode): Decimal128 {
  if (ast.kind === Kind.STRING || ast.kind === Kind.FLOAT || ast.kind === Kind.INT) {
    return Decimal128.fromString(ast.value);
  }
  if (ast.kind === Kind.OBJECT) {
    const field = ast.fields.find(f => f.name.value === '$numberDecimal');
    if (field && field.value.kind === Kind.STRING) {
      return Decimal128.fromString(field.value.value);
    }
  }
  throw new TypeError(`Decimal128 cannot represent non-decimal literal: ${ast.kind}`);
}

export const GraphQLDecimal128 = new GraphQLScalarType({
  name: 'Decimal128',
  description:
    'BSON Decimal128 (Mongoose-compatible cast). Serialized as a decimal string; accepts string, number, or `{ "$numberDecimal": "…" }`.',
  serialize: serializeDecimal128,
  parseValue: castDecimal128,
  parseLiteral,
});
