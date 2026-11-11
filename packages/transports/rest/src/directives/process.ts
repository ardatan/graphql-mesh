import type { GraphQLField, GraphQLSchema } from 'graphql';
import {
  getNamedType,
  isEnumType,
  isIntrospectionType,
  isListType,
  isNonNullType,
  isScalarType,
  isSpecifiedScalarType,
  isUnionType,
} from 'graphql';
import { type Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';
import { ObjMapScalar } from '@graphql-mesh/transport-common';
import type { MeshFetch } from '@graphql-mesh/types';
import { getDefDirectives } from '@graphql-mesh/utils';
import { getDirective, getDirectiveExtensions } from '@graphql-tools/utils';
import { processConnectDirectives } from './connect.js';
import { getTypeResolverForAbstractType } from './getTypeResolverForAbstractType.js';
import { processPubSubOperationAnnotations } from './pubsubOperation.js';
import { addExecutionLogicToScalar, processScalarType } from './scalars.js';
import { processTypeScriptAnnotations } from './typescriptAnnotations.js';

export interface ProcessDirectiveArgs {
  pubsub?: PubSub;
  log?: Logger;
  globalFetch?: MeshFetch;
  endpoint?: string;
  timeout?: number;
  operationHeaders?: Record<string, string>;
  queryParams?: Record<string, any>;
}

export function processDirectives(
  schema: GraphQLSchema,
  { globalFetch, log, pubsub, ...extraGlobalOptions }: ProcessDirectiveArgs = {},
) {
  const nonExecutableObjMapScalar = schema.getType('ObjMap');
  if (nonExecutableObjMapScalar && isScalarType(nonExecutableObjMapScalar)) {
    addExecutionLogicToScalar(nonExecutableObjMapScalar, ObjMapScalar);
  }
  const schemaDirectives = getDirectiveExtensions(schema);
  const transportDirectives = schemaDirectives?.transport;
  const joinSources = (
    (schemaDirectives?.join__directive as Array<{
      name?: string;
      args?: { http?: { headers?: Array<{ name: string; value?: string }>; baseURL?: string } };
    }>) || []
  )
    .filter(d => d?.name === 'source')
    .map(d => d.args);
  const sourceDirectives = [
    ...((schemaDirectives?.source as
      | Array<{ http?: { headers?: Array<{ name: string; value?: string }>; baseURL?: string } }>
      | undefined) || []),
    ...joinSources,
  ];
  const currDirective = transportDirectives?.[0];
  const sourceDirective = sourceDirectives?.[0];
  // Prefer Apollo @source / join__directive source; fall back to legacy Mesh @transport
  const sourceHeaders = sourceDirective?.http?.headers
    ? Object.fromEntries(
        (sourceDirective.http.headers as Array<{ name: string; value?: string }>).map(h => [
          h.name,
          h.value,
        ]),
      )
    : undefined;
  const meshRestOptions = (schema.extensions as any)?.meshRestOptions || {};
  const globalOptions = {
    endpoint: sourceDirective?.http?.baseURL ?? currDirective?.location,
    operationHeaders: sourceHeaders ?? currDirective?.headers,
    queryParams: currDirective?.queryParams,
    queryStringOptions: currDirective?.queryStringOptions ?? meshRestOptions.queryStringOptions,
    timeout: meshRestOptions.timeout,
    ...extraGlobalOptions,
  };
  // Wire @connect resolvers (Federation Connectors)
  processConnectDirectives(schema, {
    globalFetch,
    log,
    timeout: globalOptions.timeout,
    queryStringOptions: globalOptions.queryStringOptions,
  });
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
    // `@discriminator` on interfaces/unions is baked into `@connect(selection:)` as
    // `... $.field->match(...)` / `__typename: $status->match(...)` and stripped —
    // no Mesh interface resolveType installer.
    if (isUnionType(type)) {
      // resolveType: prefer `__typename` from Connectors selection; structural /
      // scalar fallback for non-Connectors / `$` passthrough unions.
      type.resolveType = getTypeResolverForAbstractType({
        possibleTypes: type.getTypes(),
        serviceName: currDirective?.subgraph,
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
      // `@enum` JSON remaps are baked into `@connect(selection:)` as `->match` /
      // `$->map(@->match)` and stripped from the SDL — no runtime enum wiring.
    }
    if ('getFields' in type) {
      const fields = type.getFields();
      for (const fieldName in fields) {
        const field = fields[fieldName];
        const directiveAnnotations = getDefDirectives(schema, field);
        for (const directiveAnnotation of directiveAnnotations) {
          switch (directiveAnnotation.name) {
            // `@resolveRoot` / `@flatten` / `@resolveRootField` / `@statusCodeTypeName`
            // / `@enum` are baked into `@connect` selections / http.body.
            case 'pubsubOperation':
              processPubSubOperationAnnotations({
                field: field as GraphQLField<any, any>,
                pubsubTopic: directiveAnnotation.args.pubsubTopic,
                globalPubsub: pubsub,
              });
              break;
            // Legacy `@httpOperation` / `@oas_link` were replaced by `@connect` (breaking).
            // `@dictionary` / `@responseMetadata` are baked into `@connect(selection:)`.
          }
        }
        // Former `@flatten`: OpenAPI oneOf(string|array) → `[Scalar]` needs deep-flatten.
        // No Connectors expression for this — coerce list-of-leaf fields without a directive.
        installListFlattenCoercion(field as GraphQLField<any, any>);
      }
    }
  }
  return schema;
}

/** `[Scalar]` fields: normalize nested arrays / singular values (ex-`@flatten`). */
function installListFlattenCoercion(field: GraphQLField<any, any>) {
  let t = field.type;
  while (isNonNullType(t)) t = t.ofType;
  if (!isListType(t)) return;
  const leaf = getNamedType(t.ofType);
  if (!isScalarType(leaf) && !isEnumType(leaf)) return;
  if (field.resolve && field.resolve.name !== 'defaultFieldResolver') return;
  const fieldName = field.name;
  field.resolve = function listFlattenCoercion(root) {
    let result = root?.[fieldName];
    if (result == null) return result;
    if (!Array.isArray(result)) {
      result = [result];
    }
    return result.flat(Infinity);
  };
}
