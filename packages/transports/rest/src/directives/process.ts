import {
  GraphQLField,
  GraphQLSchema,
  isEnumType,
  isInterfaceType,
  isScalarType,
  isUnionType,
} from 'graphql';
import { ObjMapScalar } from '@graphql-mesh/transport-common';
import { Logger, MeshFetch, MeshPubSub } from '@graphql-mesh/types';
import { getDirective, getDirectives } from '@graphql-tools/utils';
import { processDictionaryDirective } from './dictionary.js';
import { processDiscriminatorAnnotations } from './discriminator.js';
import { processFlattenAnnotations } from './flatten.js';
import { getTypeResolverForAbstractType } from './getTypeResolverForAbstractType.js';
import { addHTTPRootFieldResolver, GlobalOptions } from './httpOperation.js';
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
  const transportDirectives = getDirective(schema, schema, 'transport');
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
  if (typeof globalOptions.queryParams === 'string') {
    globalOptions.queryParams = JSON.parse(globalOptions.queryParams);
  }
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
      processScalarType(type);
    }
    if (isInterfaceType(type)) {
      const directiveAnnotations = getDirectives(schema, type);
      for (const directiveAnnotation of directiveAnnotations) {
        switch (directiveAnnotation.name) {
          case 'discriminator':
            processDiscriminatorAnnotations({
              interfaceType: type,
              discriminatorFieldName: directiveAnnotation.args.field,
            });
            break;
        }
      }
    }
    if (isUnionType(type)) {
      const directiveAnnotations = getDirectives(schema, type);
      let statusCodeTypeNameIndexMap: Record<number, string>;
      let discriminatorField: string;
      let discriminatorMapping: Record<string, string>;
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
            case 'httpOperation':
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
                  operationSpecificHeaders:
                    typeof directiveAnnotation.args.operationSpecificHeaders === 'string'
                      ? JSON.parse(directiveAnnotation.args.operationSpecificHeaders)
                      : directiveAnnotation.args.operationSpecificHeaders,
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
                },
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
