import type { ValueNode } from 'graphql';
import { GraphQLScalarType, Kind } from 'graphql';
import { resolvers as scalarResolvers } from 'graphql-scalars';
import { ObjMapScalar } from '@graphql-mesh/transport-common';
import { processLengthAnnotations } from './length.js';
import { processRegExpAnnotations } from './regexp.js';
import { processTypeScriptAnnotations } from './typescriptAnnotations.js';
import { getDirectiveAnnotations } from './utils.js';

/**
 * XSD `xs:date` allows an optional timezone (`2017-03-10+00:00`, `2017-03-10Z`).
 * GraphQL Date (RFC 3339 full-date) only accepts `YYYY-MM-DD`. Strip a *valid*
 * XSD zone so SOAP/XML responses serialize without INTERNAL_SERVER_ERROR.
 *
 * Valid offsets: `Z`, or `[+-]hh:mm` with hh 00-13 and mm 00-59, or exactly
 * `[+-]14:00`. Invalid suffixes (e.g. `+99:99`, `+14:01`, `+00:60`) are left
 * intact for GraphQL Date to reject.
 */
const XSD_DATE_WITH_TZ = /^(-?\d{4}-\d{2}-\d{2})(Z|[+-](?:14:00|(?:0\d|1[0-3]):[0-5]\d))$/;

export function coerceXsdDateString(value: unknown): unknown {
  if (typeof value === 'string') {
    const match = XSD_DATE_WITH_TZ.exec(value);
    if (match) {
      return match[1];
    }
  }
  return value;
}

function withXsdDateCoercion(scalar: GraphQLScalarType): GraphQLScalarType {
  const serialize = (value: unknown) => scalar.serialize(coerceXsdDateString(value));
  const parseValue = (value: unknown) => scalar.parseValue(coerceXsdDateString(value));
  const parseLiteral = (ast: ValueNode, variables?: Record<string, unknown> | null) => {
    if (ast.kind === Kind.STRING) {
      const coerced = coerceXsdDateString(ast.value);
      if (coerced !== ast.value) {
        return scalar.parseValue(coerced);
      }
    }
    return scalar.parseLiteral(ast, variables);
  };
  // Prefer GraphQL 17 coerce* when present on the upstream scalar.
  const coerceOutputValue =
    typeof (scalar as { coerceOutputValue?: (v: unknown) => unknown }).coerceOutputValue ===
    'function'
      ? (value: unknown) =>
          (scalar as { coerceOutputValue: (v: unknown) => unknown }).coerceOutputValue(
            coerceXsdDateString(value),
          )
      : serialize;
  const coerceInputValue =
    typeof (scalar as { coerceInputValue?: (v: unknown) => unknown }).coerceInputValue ===
    'function'
      ? (value: unknown) =>
          (scalar as { coerceInputValue: (v: unknown) => unknown }).coerceInputValue(
            coerceXsdDateString(value),
          )
      : parseValue;
  return new GraphQLScalarType({
    ...scalar.toConfig(),
    serialize,
    parseValue,
    parseLiteral,
    coerceOutputValue,
    coerceInputValue,
  } as ConstructorParameters<typeof GraphQLScalarType>[0]);
}

export function processScalarType(type: GraphQLScalarType) {
  if (type.name in scalarResolvers) {
    let actualScalar = scalarResolvers[type.name] as GraphQLScalarType;
    if (type.name === 'Date') {
      actualScalar = withXsdDateCoercion(actualScalar);
    }
    addExecutionLogicToScalar(type, actualScalar);
  }
  if (type.name === 'ObjMap') {
    addExecutionLogicToScalar(type, ObjMapScalar);
  }
  const directiveAnnotations = getDirectiveAnnotations(type);
  for (const directiveAnnotation of directiveAnnotations) {
    switch (directiveAnnotation.name) {
      case 'length':
        processLengthAnnotations(type, directiveAnnotation.args);
        break;
      case 'regexp':
        processRegExpAnnotations(type, directiveAnnotation.args.pattern);
        break;
      case 'typescript':
        processTypeScriptAnnotations(type, directiveAnnotation.args.type);
        break;
    }
  }
  return type;
}

export function addExecutionLogicToScalar(
  nonExecutableScalar: GraphQLScalarType,
  actualScalar: GraphQLScalarType,
) {
  const actual = actualScalar as GraphQLScalarType & {
    coerceOutputValue?: (value: unknown) => unknown;
    coerceInputValue?: (value: unknown) => unknown;
    coerceInputLiteral?: (ast: ValueNode, variables?: Record<string, unknown> | null) => unknown;
  };
  Object.defineProperties(nonExecutableScalar, {
    serialize: {
      value: actualScalar.serialize,
      configurable: true,
    },
    parseValue: {
      value: actualScalar.parseValue,
      configurable: true,
    },
    parseLiteral: {
      value: actualScalar.parseLiteral,
      configurable: true,
    },
    // GraphQL 17 execute uses coerce* (identity by default after buildSchema).
    coerceOutputValue: {
      value: actual.coerceOutputValue ?? actualScalar.serialize,
      configurable: true,
    },
    coerceInputValue: {
      value: actual.coerceInputValue ?? actualScalar.parseValue,
      configurable: true,
    },
    coerceInputLiteral: {
      value: actual.coerceInputLiteral ?? actualScalar.parseLiteral,
      configurable: true,
    },
    extensions: {
      value: {
        ...actualScalar.extensions,
        ...nonExecutableScalar.extensions,
      },
      configurable: true,
    },
  });
}
