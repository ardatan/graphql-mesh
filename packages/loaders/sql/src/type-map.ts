import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLString,
  type GraphQLScalarType,
} from 'graphql';
import {
  GraphQLBigInt,
  GraphQLByte,
  GraphQLDate,
  GraphQLDateTime,
  GraphQLJSON,
} from 'graphql-scalars';

export function mapSqlTypeToGraphQL(
  dataType: string,
  opts?: { asId?: boolean },
): GraphQLScalarType {
  if (opts?.asId) {
    return GraphQLID;
  }
  const t = dataType.toUpperCase();
  // Strip parenthesized args / enum labels but keep trailing modifiers (`INT(10) UNSIGNED`).
  // `enum('BINARY','TEXT')` must not become Byte; `BIT(8)` must not become Boolean.
  const typeArgs = t.match(/\(([^)]*)\)/)?.[1]?.trim();
  const baseType = t
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (baseType.includes('BOOL') || baseType === 'BOOLEAN') {
    return GraphQLBoolean;
  }
  // Postgres `varbit` / `bit varying` (and bare `bit` udt_name without width) arrive as
  // bit-strings from `pg` — map to String. MySQL `BIT(1)` is a boolean flag; wider
  // `BIT(n)` arrives as Buffer from mysql2 → Byte.
  if (baseType === 'VARBIT' || baseType.includes('BIT VARYING')) {
    return GraphQLString;
  }
  if (/\bBIT\b/.test(baseType)) {
    if (!typeArgs) {
      // Postgres introspection passes udt_name `bit` with no width.
      return GraphQLString;
    }
    if (typeArgs === '1') {
      return GraphQLBoolean;
    }
    return GraphQLByte as unknown as GraphQLScalarType;
  }
  // Avoid `Interval` / similar false positives from a bare `includes('INT')`.
  if (
    /\b(BIG|SMALL|TINY|MEDIUM)?INT(EGER)?\b/.test(baseType) ||
    baseType === 'SERIAL' ||
    baseType === 'BIGSERIAL' ||
    baseType === 'INT2' ||
    baseType === 'INT4' ||
    baseType === 'INT8'
  ) {
    if (
      baseType.includes('BIG') ||
      baseType.includes('UNSIGNED') ||
      baseType === 'INT8' ||
      baseType === 'BIGSERIAL'
    ) {
      return GraphQLBigInt as unknown as GraphQLScalarType;
    }
    return GraphQLInt;
  }
  if (
    baseType.includes('DOUBLE') ||
    baseType.includes('FLOAT') ||
    baseType.includes('REAL') ||
    baseType.includes('NUMERIC') ||
    baseType.includes('DECIMAL')
  ) {
    return GraphQLFloat;
  }
  if (baseType.includes('TIMESTAMP') || baseType.includes('DATETIME')) {
    return GraphQLDateTime as unknown as GraphQLScalarType;
  }
  if (baseType === 'DATE') {
    return GraphQLDate as unknown as GraphQLScalarType;
  }
  if (baseType.includes('JSON')) {
    return GraphQLJSON as unknown as GraphQLScalarType;
  }
  if (
    baseType === 'BYTEA' ||
    baseType === 'BINARY' ||
    baseType === 'VARBINARY' ||
    baseType === 'BLOB' ||
    baseType === 'TINYBLOB' ||
    baseType === 'MEDIUMBLOB' ||
    baseType === 'LONGBLOB'
  ) {
    // Drivers return Buffer/Uint8Array; GraphQLString cannot serialize those.
    return GraphQLByte as unknown as GraphQLScalarType;
  }
  return GraphQLString;
}
