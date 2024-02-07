import { GraphQLScalarType, GraphQLSchema } from 'graphql';
import { resolvers as scalarResolvers } from 'graphql-scalars';
import { ObjMapScalar } from '@graphql-mesh/transport-common';
import { getDirectives } from '@graphql-tools/utils';
import { processLengthAnnotations } from './length.js';
import { processRegExpAnnotations } from './regexp.js';
import { processTypeScriptAnnotations } from './typescriptAnnotations.js';

export function processScalarType(schema: GraphQLSchema, type: GraphQLScalarType) {
  if (type.name in scalarResolvers) {
    const actualScalar = scalarResolvers[type.name];
    addExecutionLogicToScalar(type, actualScalar);
  }
  if (type.name === 'ObjMap') {
    addExecutionLogicToScalar(type, ObjMapScalar);
  }
  const directiveAnnotations = getDirectives(schema, type);
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
