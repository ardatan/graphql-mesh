import { ResolverData, stringInterpolator } from '@graphql-mesh/string-interpolation';
import { Logger, MeshFetch, MeshPubSub } from '@graphql-mesh/types';
import { createGraphQLError, getDirective, getDirectives } from '@graphql-tools/utils';
import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLField,
  GraphQLID,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLLeafType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  isEnumType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isScalarType,
  isUnionType,
  OperationTypeNode,
} from 'graphql';
import lodashSet from 'lodash.set';
import {
  addHTTPRootFieldResolver,
  GlobalOptions,
  HTTPRootFieldResolverOpts,
} from './addRootFieldResolver.js';
import { getTypeResolverFromOutputTCs } from './getTypeResolverFromOutputTCs.js';
import { ObjMapScalar } from './scalars.js';
import { resolvers as scalarResolvers } from 'graphql-scalars';

export const LengthDirective = new GraphQLDirective({
  name: 'length',
  locations: [DirectiveLocation.SCALAR],
  args: {
    min: {
      type: GraphQLInt,
    },
    max: {
      type: GraphQLInt,
    },
  },
});

export function processLengthAnnotations(
  scalar: GraphQLScalarType,
  {
    min: minLength,
    max: maxLength,
  }: {
    min?: number;
    max?: number;
  },
) {
  function coerceString(value: any) {
    if (value != null) {
      const vStr = value.toString();
      if (typeof minLength !== 'undefined' && vStr.length < minLength) {
        throw new Error(`${scalar.name} cannot be less than ${minLength} but given ${vStr}`);
      }
      if (typeof maxLength !== 'undefined' && vStr.length > maxLength) {
        throw new Error(`${scalar.name} cannot be more than ${maxLength} but given ${vStr}`);
      }
      return vStr;
    }
  }

  scalar.serialize = coerceString;
  scalar.parseValue = coerceString;
  scalar.parseLiteral = ast => {
    if ('value' in ast) {
      return coerceString(ast.value);
    }
    return null;
  };
}

export const DiscriminatorDirective = new GraphQLDirective({
  name: 'discriminator',
  locations: [DirectiveLocation.INTERFACE, DirectiveLocation.UNION],
  args: {
    field: {
      type: GraphQLString,
    },
  },
});

export function processDiscriminatorAnnotations(
  interfaceType: GraphQLInterfaceType,
  fieldName: string,
) {
  interfaceType.resolveType = root => root[fieldName];
}

export const ResolveRootDirective = new GraphQLDirective({
  name: 'resolveRoot',
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export function processResolveRootAnnotations(field: GraphQLField<any, any>) {
  field.resolve = root => root;
}

export const ResolveRootFieldDirective = new GraphQLDirective({
  name: 'resolveRootField',
  locations: [
    DirectiveLocation.FIELD_DEFINITION,
    DirectiveLocation.ARGUMENT_DEFINITION,
    DirectiveLocation.INPUT_FIELD_DEFINITION,
  ],
  args: {
    field: {
      type: GraphQLString,
    },
  },
});

function isOriginallyListType(type: GraphQLOutputType): boolean {
  if (isNonNullType(type)) {
    return isOriginallyListType(type.ofType);
  }
  return isListType(type);
}

export function processResolveRootFieldAnnotations(
  field: GraphQLField<any, any>,
  propertyName: string,
) {
  if (!field.resolve || field.resolve.name === 'defaultFieldResolver') {
    field.resolve = (root, args, context, info) => {
      const actualFieldObj = root[propertyName];
      if (actualFieldObj != null) {
        const isArray = Array.isArray(actualFieldObj);
        const isListType = isOriginallyListType(info.returnType);
        if (isListType && !isArray) {
          return [actualFieldObj];
        } else if (!isListType && isArray) {
          return actualFieldObj[0];
        }
      }
      return actualFieldObj;
    };
  }
}

export const RegExpDirective = new GraphQLDirective({
  name: 'regexp',
  locations: [DirectiveLocation.SCALAR],
  args: {
    pattern: {
      type: GraphQLString,
    },
  },
});

export function processRegExpAnnotations(scalar: GraphQLScalarType, pattern: string) {
  function coerceString(value: any) {
    if (value != null) {
      const vStr = value.toString();
      const regexp = new RegExp(pattern);
      if (!regexp.test(vStr)) {
        throw new Error(`${scalar.name} must match ${pattern} but given ${vStr}`);
      }
      return vStr;
    }
  }

  scalar.serialize = coerceString;
  scalar.parseValue = coerceString;
  scalar.parseLiteral = ast => {
    if ('value' in ast) {
      return coerceString(ast.value);
    }
    return null;
  };
}

export const PubSubOperationDirective = new GraphQLDirective({
  name: 'pubsubOperation',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    pubsubTopic: {
      type: GraphQLString,
    },
  },
});

interface ProcessPubSubOperationAnnotationsOpts {
  field: GraphQLField<any, any>;
  globalPubsub: MeshPubSub;
  pubsubTopic: string;
  logger: Logger;
}

export function processPubSubOperationAnnotations({
  field,
  globalPubsub,
  pubsubTopic,
  logger,
}: ProcessPubSubOperationAnnotationsOpts) {
  field.subscribe = (root, args, context, info) => {
    const operationLogger = logger.child(`${info.parentType.name}.${field.name}`);
    const pubsub = context?.pubsub || globalPubsub;
    if (!pubsub) {
      return createGraphQLError(
        `You should have PubSub defined in either the config or the context!`,
      );
    }
    const interpolationData = { root, args, context, info, env: process.env };
    let interpolatedPubSubTopic: string = stringInterpolator.parse(pubsubTopic, interpolationData);
    if (interpolatedPubSubTopic.startsWith('webhook:')) {
      const [, expectedMethod, expectedUrl] = interpolatedPubSubTopic.split(':');
      const expectedPath = new URL(expectedUrl, 'http://localhost').pathname;
      interpolatedPubSubTopic = `webhook:${expectedMethod}:${expectedPath}`;
    }
    operationLogger.debug(`=> Subscribing to pubSubTopic: ${interpolatedPubSubTopic}`);
    return pubsub.asyncIterator(interpolatedPubSubTopic);
  };
  field.resolve = (root, args, context, info) => {
    const operationLogger = logger.child(`${info.parentType.name}.${field.name}`);
    operationLogger.debug('Received ', root, ' from ', pubsubTopic);
    return root;
  };
}

export const TypeScriptDirective = new GraphQLDirective({
  name: 'typescript',
  locations: [DirectiveLocation.SCALAR, DirectiveLocation.ENUM],
  args: {
    type: {
      type: GraphQLString,
    },
  },
});

export function processTypeScriptAnnotations(type: GraphQLLeafType, typeDefinition: string) {
  type.extensions = type.extensions || {};
  (type.extensions as any).codegenScalarType = typeDefinition;
}

function addExecutionLogicToScalar(
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

export const HTTPOperationDirective = new GraphQLDirective({
  name: 'httpOperation',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    path: {
      type: GraphQLString,
    },
    operationSpecificHeaders: {
      type: ObjMapScalar,
    },
    httpMethod: {
      type: new GraphQLEnumType({
        name: 'HTTPMethod',
        values: {
          GET: { value: 'GET' },
          HEAD: { value: 'HEAD' },
          POST: { value: 'POST' },
          PUT: { value: 'PUT' },
          DELETE: { value: 'DELETE' },
          CONNECT: { value: 'CONNECT' },
          OPTIONS: { value: 'OPTIONS' },
          TRACE: { value: 'TRACE' },
          PATCH: { value: 'PATCH' },
        },
      }),
    },
    isBinary: {
      type: GraphQLBoolean,
    },
    requestBaseBody: {
      type: ObjMapScalar,
    },
    queryParamArgMap: {
      type: ObjMapScalar,
    },
    queryStringOptionsByParam: {
      type: ObjMapScalar,
    },
  },
});

export const GlobalOptionsDirective = new GraphQLDirective({
  name: 'globalOptions',
  locations: [DirectiveLocation.OBJECT],
  args: {
    sourceName: {
      type: GraphQLString,
    },
    endpoint: {
      type: GraphQLString,
    },
    operationHeaders: {
      type: ObjMapScalar,
    },
    queryStringOptions: {
      type: ObjMapScalar,
    },
    queryParams: {
      type: ObjMapScalar,
    },
  },
});

export const ResponseMetadataDirective = new GraphQLDirective({
  name: 'responseMetadata',
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export function processResponseMetadataAnnotations(field: GraphQLField<any, any>) {
  field.resolve = function responseMetadataResolver(root) {
    return {
      url: root.$url,
      headers: root.$response.header,
      method: root.$method,
      status: root.$statusCode,
      statusText: root.$statusText,
      body: root.$response.body,
    };
  };
}

export const LinkDirective = new GraphQLDirective({
  name: 'link',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    defaultRootType: {
      type: GraphQLString,
    },
    defaultField: {
      type: GraphQLString,
    },
  },
});

export const LinkResolverDirective = new GraphQLDirective({
  name: 'linkResolver',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    linkResolverMap: {
      type: ObjMapScalar,
    },
  },
});

interface LinkResolverOpts {
  linkObjArgs: any;
  targetTypeName: string;
  targetFieldName: string;
}

function linkResolver(
  { linkObjArgs, targetTypeName, targetFieldName }: LinkResolverOpts,
  { root, args, context, info, env }: ResolverData,
) {
  for (const argKey in linkObjArgs) {
    const argInterpolation = linkObjArgs[argKey];
    const actualValue =
      typeof argInterpolation === 'string'
        ? stringInterpolator.parse(argInterpolation, {
            root,
            args,
            context,
            info,
            env,
          })
        : argInterpolation;
    lodashSet(args, argKey, actualValue);
  }
  const type = info.schema.getType(targetTypeName) as GraphQLObjectType;
  const field = type.getFields()[targetFieldName];
  return field.resolve(root, args, context, info);
}

function getLinkResolverMap(schema: GraphQLSchema, field: GraphQLField<any, any>) {
  const parentFieldLinkResolverDirectives = getDirective(schema, field, 'linkResolver');
  if (parentFieldLinkResolverDirectives?.length) {
    const linkResolverMap = parentFieldLinkResolverDirectives[0].linkResolverMap;
    if (linkResolverMap) {
      return linkResolverMap;
    }
  }
}

function findLinkResolverMap({
  schema,
  operationType,
  defaultRootTypeName,
  defaultFieldName,
}: {
  schema: GraphQLSchema;
  defaultRootTypeName: string;
  defaultFieldName: string;
  parentFieldName: string;
  operationType: OperationTypeNode;
}) {
  const parentType = schema.getRootType(operationType);
  const parentField = parentType.getFields()[operationType];
  if (parentField) {
    const linkResolverMap = getLinkResolverMap(schema, parentField);
    if (linkResolverMap) {
      return linkResolverMap;
    }
  }
  const defaultRootType = schema.getType(defaultRootTypeName) as GraphQLObjectType;
  if (defaultRootType) {
    const defaultField = defaultRootType.getFields()[defaultFieldName];
    if (defaultField) {
      const linkResolverMap = getLinkResolverMap(schema, defaultField);
      if (linkResolverMap) {
        return linkResolverMap;
      }
    }
  }
}

export function processLinkFieldAnnotations(
  field: GraphQLField<any, any>,
  defaultRootTypeName: string,
  defaultFieldName: string,
) {
  field.resolve = (root, args, context, info) => {
    const linkResolverMap = findLinkResolverMap({
      schema: info.schema,
      defaultRootTypeName,
      defaultFieldName,
      parentFieldName: root.$field,
      operationType: info.operation.operation,
    });
    const linkResolverOpts = linkResolverMap[field.name];
    return linkResolver(linkResolverOpts, { root, args, context, info, env: process.env });
  };
}

export const DictionaryDirective = new GraphQLDirective({
  name: 'dictionary',
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export function processDictionaryDirective(
  fieldMap: Record<string, GraphQLField<any, any>>,
  field: GraphQLField<any, any>,
) {
  field.resolve = root => {
    const result = [];
    for (const key in root) {
      if (key in fieldMap) {
        continue;
      }
      result.push({
        key,
        value: root[key],
      });
    }
    return result;
  };
}

interface ProcessDirectiveArgs {
  schema: GraphQLSchema;
  pubsub: MeshPubSub;
  logger: Logger;
  globalFetch: MeshFetch;
  endpoint?: string;
  operationHeaders?: Record<string, string>;
  queryParams?: Record<string, any>;
}

export function processDirectives({
  schema,
  globalFetch,
  logger,
  pubsub,
  ...extraGlobalOptions
}: ProcessDirectiveArgs) {
  const nonExecutableObjMapScalar = schema.getType('ObjMap');
  if (nonExecutableObjMapScalar && isScalarType(nonExecutableObjMapScalar)) {
    addExecutionLogicToScalar(nonExecutableObjMapScalar, ObjMapScalar);
  }
  let [globalOptions = {}] = (getDirective(schema, schema.getQueryType(), 'globalOptions') ||
    []) as [GlobalOptions];
  globalOptions = {
    ...globalOptions,
    ...extraGlobalOptions,
  };
  const typeMap = schema.getTypeMap();
  for (const typeName in typeMap) {
    const type = typeMap[typeName];
    const exampleAnnotations = getDirective(schema, type, 'example');
    if (exampleAnnotations?.length) {
      const examples = [];
      for (const exampleAnnotation of exampleAnnotations) {
        if (exampleAnnotation?.value) {
          examples.push(exampleAnnotation.value);
        }
      }
      type.extensions = type.extensions || {};
      (type.extensions as any).examples = examples;
    }
    if (isScalarType(type)) {
      processScalarType(schema, type);
    }
    if (isInterfaceType(type)) {
      const directiveAnnotations = getDirectives(schema, type);
      for (const directiveAnnotation of directiveAnnotations) {
        switch (directiveAnnotation.name) {
          case 'discriminator':
            processDiscriminatorAnnotations(type, directiveAnnotation.args.field);
            break;
        }
      }
    }
    if (isUnionType(type)) {
      const directiveAnnotations = getDirectives(schema, type);
      let statusCodeTypeNameIndexMap: Record<number, string>;
      let discriminatorField: string;
      for (const directiveAnnotation of directiveAnnotations) {
        switch (directiveAnnotation.name) {
          case 'statusCodeTypeName':
            statusCodeTypeNameIndexMap = statusCodeTypeNameIndexMap || {};
            statusCodeTypeNameIndexMap[directiveAnnotation.args.statusCode] =
              directiveAnnotation.args.typeName;
            break;
          case 'discriminator':
            discriminatorField = directiveAnnotation.args.field;
            break;
        }
      }
      type.resolveType = getTypeResolverFromOutputTCs(
        type.getTypes(),
        discriminatorField,
        statusCodeTypeNameIndexMap,
      );
    }
    if (isEnumType(type)) {
      const directiveAnnotations = getDirectives(schema, type);
      for (const directiveAnnotation of directiveAnnotations) {
        switch (directiveAnnotation.name) {
          case 'typescript':
            processTypeScriptAnnotations(type, directiveAnnotation.args.type);
            break;
        }
      }
      const enumValues = type.getValues();
      for (const enumValue of enumValues) {
        const directiveAnnotations = getDirectives(schema, enumValue);
        for (const directiveAnnotation of directiveAnnotations) {
          switch (directiveAnnotation.name) {
            case 'enum': {
              const realValue = JSON.parse(directiveAnnotation.args.value);
              enumValue.value = realValue;
              (type as any)._valueLookup.set(realValue, enumValue);
              break;
            }
          }
        }
      }
    }
    if ('getFields' in type) {
      const fields = type.getFields();
      for (const fieldName in fields) {
        const field = fields[fieldName];
        const directiveAnnotations = getDirectives(schema, field);
        for (const directiveAnnotation of directiveAnnotations) {
          switch (directiveAnnotation.name) {
            case 'resolveRoot':
              processResolveRootAnnotations(field as GraphQLField<any, any>);
              break;
            case 'resolveRootField':
              processResolveRootFieldAnnotations(
                field as GraphQLField<any, any>,
                directiveAnnotation.args.field,
              );
              break;
            case 'pubsubOperation':
              processPubSubOperationAnnotations({
                field: field as GraphQLField<any, any>,
                pubsubTopic: directiveAnnotation.args.pubsubTopic,
                globalPubsub: pubsub,
                logger,
              });
              break;
            case 'httpOperation':
              addHTTPRootFieldResolver(
                schema,
                field as GraphQLField<any, any>,
                logger,
                globalFetch,
                directiveAnnotation.args as HTTPRootFieldResolverOpts,
                globalOptions as GlobalOptions,
              );
              break;
            case 'responseMetadata':
              processResponseMetadataAnnotations(field as GraphQLField<any, any>);
              break;
            case 'link':
              processLinkFieldAnnotations(
                field as GraphQLField<any, any>,
                directiveAnnotation.args.defaultRootType,
                directiveAnnotation.args.defaultField,
              );
              break;
            case 'dictionary':
              processDictionaryDirective(
                fields as Record<string, GraphQLField<any, any>>,
                field as GraphQLField<any, any>,
              );
          }
        }
      }
    }
  }
  return schema;
}

export const StatusCodeTypeNameDirective = new GraphQLDirective({
  name: 'statusCodeTypeName',
  locations: [DirectiveLocation.UNION],
  isRepeatable: true,
  args: {
    typeName: {
      type: GraphQLString,
    },
    statusCode: {
      type: GraphQLID,
    },
  },
});

export const EnumDirective = new GraphQLDirective({
  name: 'enum',
  locations: [DirectiveLocation.ENUM_VALUE],
  args: {
    value: {
      type: GraphQLString,
    },
  },
});

export const OneOfDirective = new GraphQLDirective({
  name: 'oneOf',
  locations: [DirectiveLocation.OBJECT, DirectiveLocation.INTERFACE],
});

export const ExampleDirective = new GraphQLDirective({
  name: 'example',
  locations: [
    DirectiveLocation.FIELD_DEFINITION,
    DirectiveLocation.OBJECT,
    DirectiveLocation.INPUT_OBJECT,
    DirectiveLocation.ENUM,
    DirectiveLocation.SCALAR,
  ],
  args: {
    value: {
      type: ObjMapScalar,
    },
  },
  isRepeatable: true,
});
