import type { GraphQLField, GraphQLSchema } from 'graphql';
import {
  isEnumType,
  isInterfaceType,
  isIntrospectionType,
  isScalarType,
  isSpecifiedScalarType,
  isUnionType,
} from 'graphql';
import { ObjMapScalar } from '@graphql-mesh/transport-common';
import type { Logger, MeshFetch, MeshPubSub } from '@graphql-mesh/types';
import { getDefDirectives } from '@graphql-mesh/utils';
import { getDirective, getDirectiveExtensions } from '@graphql-tools/utils';
import { processDictionaryDirective } from './dictionary.js';
import { processDiscriminatorAnnotations } from './discriminator.js';
import { processFlattenAnnotations } from './flatten.js';
import { getTypeResolverForAbstractType } from './getTypeResolverForAbstractType.js';
import type { GlobalOptions } from './httpOperation.js';
import { addHTTPRootFieldResolver } from './httpOperation.js';
import { processLinkFieldAnnotations } from './link.js';
import { processPubSubOperationAnnotations } from './pubsubOperation.js';
import { processResolveRootAnnotations } from './resolveRoot.js';
import { processResolveRootFieldAnnotations } from './resolveRootField.js';
import { processResponseMetadataAnnotations } from './responseMetadata.js';
import { addExecutionLogicToScalar, processScalarType } from './scalars.js';
import { processTypeScriptAnnotations } from './typescriptAnnotations.js';

export interface ProcessDirectiveArgs {
  pubsub?: MeshPubSub;
  logger?: Logger;
  globalFetch?: MeshFetch;
  endpoint?: string;
  timeout?: number;
  operationHeaders?: Record<string, string>;
  queryParams?: Record<string, any>;
}

export function processDirectives(
  schema: GraphQLSchema,
  { globalFetch, logger, pubsub, ...extraGlobalOptions }: ProcessDirectiveArgs = {},
) {
  const nonExecutableObjMapScalar = schema.getType('ObjMap');
  if (nonExecutableObjMapScalar && isScalarType(nonExecutableObjMapScalar)) {
    addExecutionLogicToScalar(nonExecutableObjMapScalar, ObjMapScalar);
  }
  const transportDirectives = getDirectiveExtensions(schema)?.transport;
  const currDirective = transportDirectives?.[0];
  const globalOptions = {
    endpoint: currDirective?.location,
    operationHeaders: currDirective?.headers,
    queryParams: currDirective?.queryParams,
    queryStringOptions: currDirective?.queryStringOptions,
    ...extraGlobalOptions,
  };
  if (typeof globalOptions.operationHeaders === 'string') {
    globalOptions.operationHeaders = JSON.parse(globalOptions.operationHeaders);
  }
  if (Array.isArray(globalOptions.operationHeaders)) {
    globalOptions.operationHeaders = Object.fromEntries(globalOptions.operationHeaders);
  }
  if (typeof globalOptions.queryParams === 'string') {
    globalOptions.queryParams = JSON.parse(globalOptions.queryParams);
  }
  if (Array.isArray(globalOptions.queryParams)) {
    globalOptions.queryParams = Object.fromEntries(globalOptions.queryParams);
  }
  const typeMap = schema.getTypeMap();
  for (const typeName in typeMap) {
    const type = typeMap[typeName];
    if (isSpecifiedScalarType(type) || isIntrospectionType(type)) {
      continue;
    }
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
      processScalarType(type);
    }
    if (isInterfaceType(type)) {
      const directiveAnnotations = getDefDirectives(schema, type);
      for (const directiveAnnotation of directiveAnnotations) {
        switch (directiveAnnotation.name) {
          case 'discriminator':
            processDiscriminatorAnnotations({
              interfaceType: type,
              discriminatorField: directiveAnnotation.args.field,
              discriminatorMapping: directiveAnnotation.args.mapping,
            });
            break;
        }
      }
    }
    if (isUnionType(type)) {
      const directiveAnnotations = getDefDirectives(schema, type);
      let statusCodeTypeNameIndexMap: Record<number, string>;
      let discriminatorField: string;
      let discriminatorMapping: [string, string][];
      for (const directiveAnnotation of directiveAnnotations) {
        switch (directiveAnnotation.name) {
          case 'statusCodeTypeName':
            statusCodeTypeNameIndexMap = statusCodeTypeNameIndexMap || {};
            statusCodeTypeNameIndexMap[directiveAnnotation.args.statusCode] =
              directiveAnnotation.args.typeName;
            break;
          case 'discriminator':
            discriminatorField = directiveAnnotation.args.field;
            discriminatorMapping = directiveAnnotation.args.mapping;
            break;
        }
      }
      type.resolveType = getTypeResolverForAbstractType({
        possibleTypes: type.getTypes(),
        discriminatorField,
        discriminatorMapping,
        statusCodeTypeNameMap: statusCodeTypeNameIndexMap,
      });
    }
    if (isEnumType(type)) {
      const directiveAnnotations = getDefDirectives(schema, type);
      for (const directiveAnnotation of directiveAnnotations) {
        switch (directiveAnnotation.name) {
          case 'typescript':
            processTypeScriptAnnotations(type, directiveAnnotation.args.type);
            break;
        }
      }
      const enumValues = type.getValues();
      for (const enumValue of enumValues) {
        const directiveAnnotations = getDefDirectives(schema, enumValue);
        for (const directiveAnnotation of directiveAnnotations) {
          switch (directiveAnnotation.name) {
            case 'enum': {
              const realValue = JSON.parse(directiveAnnotation.args.value);
              enumValue.value = realValue;
              let valueLookup = (type as any)._valueLookup;
              if (!valueLookup) {
                valueLookup = new Map(
                  type.getValues().map(enumValue => [enumValue.value, enumValue]),
                );
                (type as any)._valueLookup = valueLookup;
              }
              valueLookup.set(realValue, enumValue);
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
        const directiveAnnotations = getDefDirectives(schema, field);
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
            case 'flatten':
              processFlattenAnnotations(field as GraphQLField<any, any>);
              break;
            case 'pubsubOperation':
              processPubSubOperationAnnotations({
                field: field as GraphQLField<any, any>,
                pubsubTopic: directiveAnnotation.args.pubsubTopic,
                globalPubsub: pubsub,
                logger,
              });
              break;
            case 'httpOperation': {
              let operationSpecificHeaders = directiveAnnotation.args.operationSpecificHeaders;
              if (typeof directiveAnnotation.args.operationSpecificHeaders === 'string') {
                operationSpecificHeaders = JSON.parse(
                  directiveAnnotation.args.operationSpecificHeaders,
                );
              }
              if (Array.isArray(directiveAnnotation.args.operationSpecificHeaders)) {
                operationSpecificHeaders = Object.fromEntries(
                  directiveAnnotation.args.operationSpecificHeaders,
                );
              }
              addHTTPRootFieldResolver(
                schema,
                field as GraphQLField<any, any>,
                logger,
                globalFetch,
                // TODO: Fix JSON parsing here for queryParams and headers
                {
                  sourceName: directiveAnnotation.args.sourceName,
                  endpoint: directiveAnnotation.args.endpoint,
                  path: directiveAnnotation.args.path,
                  httpMethod: directiveAnnotation.args.httpMethod,
                  operationSpecificHeaders,
                  isBinary: directiveAnnotation.args.isBinary,
                  requestBaseBody:
                    typeof directiveAnnotation.args.requestBaseBody === 'string'
                      ? JSON.parse(directiveAnnotation.args.requestBaseBody)
                      : directiveAnnotation.args.requestBaseBody,
                  queryParamArgMap:
                    typeof directiveAnnotation.args.queryParamArgMap === 'string'
                      ? JSON.parse(directiveAnnotation.args.queryParamArgMap)
                      : directiveAnnotation.args.queryParamArgMap,
                  queryStringOptionsByParam:
                    typeof directiveAnnotation.args.queryStringOptionsByParam === 'string'
                      ? JSON.parse(directiveAnnotation.args.queryStringOptionsByParam)
                      : directiveAnnotation.args.queryStringOptionsByParam,
                  jsonApiFields: directiveAnnotation.args.jsonApiFields,
                  queryStringOptions: directiveAnnotation.args.queryStringOptions,
                },
                globalOptions as GlobalOptions,
              );
              break;
            }
            case 'responseMetadata':
              processResponseMetadataAnnotations(field as GraphQLField<any, any>);
              break;
            case 'oas_link':
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
