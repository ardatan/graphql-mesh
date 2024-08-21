import type { GraphQLScalarType } from 'graphql';
import { resolvers as scalarResolvers } from 'graphql-scalars';
import { ObjMapScalar } from '@graphql-mesh/transport-common';
import { processLengthAnnotations } from './length.js';
import { processRegExpAnnotations } from './regexp.js';
import { processTypeScriptAnnotations } from './typescriptAnnotations.js';
import { getDirectiveAnnotations } from './utils.js';

export function processScalarType(type: GraphQLScalarType) {
  if (type.name in scalarResolvers) {
    const actualScalar = scalarResolvers[type.name];
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
