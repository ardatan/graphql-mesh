import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLScalarType,
  GraphQLString,
} from 'graphql';
import {
  GraphQLBigInt,
  GraphQLByte,
  GraphQLDate,
  GraphQLDateTime,
  GraphQLEmailAddress,
  GraphQLJSON,
  GraphQLTime,
  GraphQLTimestamp,
  GraphQLURL,
  GraphQLUUID,
} from 'graphql-scalars';

/**
 * Built-in + graphql-scalars names for YAML `scalarMap: { id: ID, date: Date }`.
 * Keys are case-sensitive GraphQL type names.
 *
 * Lives in the legacy JSON Schema handler (YAML/.meshrc concern). Omnigraph /
 * mesh.config pass GraphQL scalar instances directly.
 */
const NAMED_SCALARS: Record<string, GraphQLScalarType> = {
  String: GraphQLString,
  ID: GraphQLID,
  Int: GraphQLInt,
  Float: GraphQLFloat,
  Boolean: GraphQLBoolean,
  Date: GraphQLDate,
  DateTime: GraphQLDateTime,
  Time: GraphQLTime,
  Timestamp: GraphQLTimestamp,
  URL: GraphQLURL,
  UUID: GraphQLUUID,
  JSON: GraphQLJSON,
  BigInt: GraphQLBigInt,
  Byte: GraphQLByte,
  EmailAddress: GraphQLEmailAddress,
  File: new GraphQLScalarType({
    name: 'File',
    description: 'The `File` scalar type represents a file upload.',
  }),
  Void: new GraphQLScalarType({
    name: 'Void',
    description: 'Represents empty values',
    serialize: () => '',
  }),
};

export type ScalarMapInput = Record<string, GraphQLScalarType | string> | undefined;

/**
 * Resolve a title → scalar map. Values may be GraphQL scalar instances (JS config
 * / module path) or type-name strings (`ID`, `Date`, `URL`, …) for YAML.
 */
export function resolveScalarMap(
  scalarMap: ScalarMapInput,
): Record<string, GraphQLScalarType> | undefined {
  if (!scalarMap) {
    return undefined;
  }
  const resolved: Record<string, GraphQLScalarType> = {};
  for (const [title, value] of Object.entries(scalarMap)) {
    if (value && typeof value === 'object' && 'name' in value && 'serialize' in value) {
      resolved[title] = value as GraphQLScalarType;
      continue;
    }
    if (typeof value === 'string') {
      const named = NAMED_SCALARS[value];
      if (!named) {
        throw new Error(
          `Unknown scalarMap type name "${value}" for title "${title}". ` +
            `Known: ${Object.keys(NAMED_SCALARS).join(', ')}`,
        );
      }
      resolved[title] = named;
      continue;
    }
    throw new Error(
      `scalarMap["${title}"] must be a GraphQL scalar or a type name string (got ${typeof value})`,
    );
  }
  return resolved;
}
