import type { GraphQLScalarType, ValueNode } from 'graphql';
import { Kind } from 'graphql';
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
  return {
    ...scalar,
    serialize(value: unknown) {
      return scalar.serialize(coerceXsdDateString(value));
    },
    parseValue(value: unknown) {
      return scalar.parseValue(coerceXsdDateString(value));
    },
    parseLiteral(ast: ValueNode, variables?: Record<string, unknown> | null) {
      if (ast.kind === Kind.STRING) {
        const coerced = coerceXsdDateString(ast.value);
        if (coerced !== ast.value) {
          return scalar.parseValue(coerced);
        }
      }
      return scalar.parseLiteral(ast, variables);
    },
  } as GraphQLScalarType;
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
  Object.defineProperties(nonExecutableScalar, {
    serialize: {
      value: actualScalar.serialize,
    },
    parseValue: {
      value: actualScalar.parseValue,
    },
    parseLiteral: {
      value: actualScalar.parseLiteral,
    },
    extensions: {
      value: {
        ...actualScalar.extensions,
        ...nonExecutableScalar.extensions,
      },
    },
  });
}
