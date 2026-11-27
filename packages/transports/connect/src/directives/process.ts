import type { GraphQLField, GraphQLOutputType, GraphQLSchema } from 'graphql';
import {
  getNamedType,
  isEnumType,
  isInterfaceType,
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
import {
  getDefDirectives,
  getTransportOptions,
  type ConnectTransportDirectiveOptions,
} from '@graphql-mesh/utils';
import { getDirective, getDirectiveExtensions } from '@graphql-tools/utils';
import { processConnectDirectives } from './connect.js';
import {
  getMeshGeneratedResolveTypeMemberKey,
  getTypeResolverForAbstractType,
  isMeshGeneratedResolveType,
  meshResolveTypeMemberKey,
} from './getTypeResolverForAbstractType.js';
import { processPubSubOperationAnnotations } from './pubsubOperation.js';
import { addExecutionLogicToScalar, processScalarType } from './scalars.js';
import { processTypeScriptAnnotations } from './typescriptAnnotations.js';
import { coerceXmlLeafForGraphQLType, unwrapXmlScalarLeaf } from './xmlCodec.js';

/**
 * Options for {@link processDirectives} - wire `@connect` / `@source` (and legacy
 * Mesh annotations) into executable field resolvers.
 *
 * @example
 * ```ts
 * import { processDirectives } from '@graphql-mesh/transport-connect';
 *
 * // HTTP base URL / headers / query come from `@source` / `@connect` on the schema.
 * // processDirectives forwards timeout + queryStringOptions (+ odata opts) only.
 * const executable = processDirectives(schema, {
 *   globalFetch: fetch,
 *   timeout: 30_000,
 * });
 * ```
 */
export interface ProcessDirectiveArgs {
  /** PubSub for `@pubsubOperation` / subscription topics. */
  pubsub?: PubSub;
  /** Logger instance. */
  log?: Logger;
  /** Fetch used for `@connect` HTTP calls. */
  globalFetch?: MeshFetch;
  /**
   * When true (legacy `get-mesh` reprocess after `additionalTypeDefs`):
   * - skip `@connect` install on fields that already have a resolver (wrap proxies)
   * - keep application-provided abstract `resolveType` callbacks; rebuild
   *   Mesh-generated ones when union/interface members change
   */
  preserveExistingFieldResolvers?: boolean;
  /**
   * Accepted for compatibility, but not forwarded into `@connect` resolvers
   * today. Put the HTTP base URL on `@source(http.baseURL)` - `@connect`
   * joins relative connector URLs from that source only; `@transport(location)`
   * is not used as a base URL fallback.
   */
  endpoint?: string;
  /**
   * HTTP timeout in milliseconds. Applied as `AbortSignal.timeout` on
   * `@connect` fetches when set; omitted means no processDirectives-level timeout.
   *
   * @example 30_000
   */
  timeout?: number;
  /**
   * Accepted for compatibility, but not forwarded into `@connect` resolvers
   * today. Bake headers into `@source` / `@connect` instead.
   */
  operationHeaders?: Record<string, string>;
  /**
   * Accepted for compatibility, but not forwarded into `@connect` resolvers
   * today. Put static query params on `@source` / per-field mappings instead.
   */
  queryParams?: Record<string, any>;
  /**
   * `qs` stringify options for form-urlencoded bodies and query strings
   * (`arrayFormat`, `allowDots`, ...). Field-level options can still override.
   *
   * @example { arrayFormat: 'repeat' }
   */
  queryStringOptions?: any;
}

export function processDirectives(
  schema: GraphQLSchema,
  {
    globalFetch,
    log,
    pubsub,
    preserveExistingFieldResolvers,
    ...extraGlobalOptions
  }: ProcessDirectiveArgs = {},
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
  // Options arrive via join / Mesh `@transport(options:)` or `extraGlobalOptions`
  // from getSubgraphExecutor / loadGraphQLSchema* (bare connect has no transport).
  const transportOpts = getTransportOptions<ConnectTransportDirectiveOptions>(currDirective);
  const globalOptions = {
    endpoint: sourceDirective?.http?.baseURL ?? currDirective?.location,
    operationHeaders: sourceHeaders ?? currDirective?.headers,
    queryParams: transportOpts.queryParams,
    queryStringOptions: transportOpts.queryStringOptions,
    timeout: transportOpts.timeout,
    ...extraGlobalOptions,
  };
  // Wire @connect resolvers (Federation Connectors).
  // HTTP headers come from `@source` / `@connect` only (WSDL emit already bakes yaml
  // operationHeaders into `@source`); no separate runtime header bag.
  const odataOpts = transportOpts.odata;
  // Wire scalar serialize/parse on the *pre-rebuild* type identities first so
  // connector closures captured inside processConnectDirectives keep working
  // after mapSchema clones the type map (installQueryField / `_entities`).
  for (const type of Object.values(schema.getTypeMap())) {
    if (isSpecifiedScalarType(type) || isIntrospectionType(type)) {
      continue;
    }
    if (isScalarType(type)) {
      processScalarType(type);
    }
  }
  // `processConnectDirectives` may rebuild Query via `mapSchema` when installing
  // Federation `_entities` — callers must use the returned schema.
  schema = processConnectDirectives(schema, {
    globalFetch,
    log,
    timeout: globalOptions.timeout,
    queryStringOptions: globalOptions.queryStringOptions,
    preserveExistingFieldResolvers,
    // Mirror `@transport(options: { odata: … })` under connect opts.
    // Batch root URL comes from `@source` http.baseURL (see processConnectDirectives).
    odata: {
      expandNavProps: Boolean(odataOpts?.expandNavProps),
      batch: odataOpts?.batch,
      securityHeaderNames: odataOpts?.securityHeaderNames,
    },
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
      // Rebind on post-rebuild clones used for parse/coerce against the returned schema.
      processScalarType(type);
    }
    // Abstract resolveType: `__typename`, OData `@odata.type`, then structural /
    // scalar fallback. OpenAPI `@discriminator` is baked into `@connect(selection:)`
    // and stripped - no Mesh `@abstractType` directive.
    if (isInterfaceType(type) || isUnionType(type)) {
      const possibleTypes = isUnionType(type) ? type.getTypes() : schema.getPossibleTypes(type);
      const memberKey = meshResolveTypeMemberKey(possibleTypes);
      const existing = type.resolveType;
      // Reprocess after additionalTypeDefs: keep application / stitch custom
      // resolveType. Rebuild Mesh-generated callbacks when members change so a
      // newly added union member without `__typename` still resolves.
      const keepAppResolveType =
        preserveExistingFieldResolvers && existing && !isMeshGeneratedResolveType(existing);
      const keepGeneratedSameMembers =
        preserveExistingFieldResolvers &&
        existing &&
        isMeshGeneratedResolveType(existing) &&
        getMeshGeneratedResolveTypeMemberKey(existing) === memberKey;
      if (!keepAppResolveType && !keepGeneratedSameMembers) {
        type.resolveType = getTypeResolverForAbstractType({
          possibleTypes,
          serviceName: currDirective?.subgraph,
        });
      }
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
      // `$->map(@->match)` and stripped from the SDL - no runtime enum wiring.
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
              // Skip when no pubsub — clear no-op (subscribe is not installed).
              // Callers that need Mesh `@pubsubOperation` must pass `pubsub`.
              if (pubsub) {
                processPubSubOperationAnnotations({
                  field: field as GraphQLField<any, any>,
                  pubsubTopic: directiveAnnotation.args.pubsubTopic,
                  globalPubsub: pubsub,
                });
              }
              break;
            // Legacy `@httpOperation` / `@oas_link` were replaced by `@connect` (breaking).
            // `@dictionary` / `@responseMetadata` are baked into `@connect(selection:)`.
          }
        }
        // Former `@flatten`: OpenAPI oneOf(string|array) → `[Scalar]` needs deep-flatten.
        // Also legacy SOAP soapDefaultResolver: wrap/unwrap nested lists by GraphQL type.
        installXmlListPluralization(field as GraphQLField<any, any>);
        // Attributed XML leaves stay structured for selection; unwrap at scalar fields.
        installXmlScalarUnwrap(field as GraphQLField<any, any>);
      }
    }
  }
  return schema;
}

function isListTypeOrNonNullListType(type: GraphQLOutputType): boolean {
  if (isNonNullType(type)) {
    return isListType(type.ofType);
  }
  return isListType(type);
}

/**
 * Nested XML/SOAP list fields: a single unbounded sibling is an object, not an array.
 * Match legacy transport-soap `soapDefaultResolver` wrap (+ OpenAPI `@flatten` for scalar lists).
 * Only list fields - singular Date/String fields use `installXmlScalarUnwrap`.
 */
function installXmlListPluralization(field: GraphQLField<any, any>) {
  if (field.resolve && field.resolve.name !== 'defaultFieldResolver') return;
  if (!isListTypeOrNonNullListType(field.type)) return;
  let listInner = field.type;
  while (isNonNullType(listInner)) listInner = listInner.ofType;
  const leaf = isListType(listInner) ? getNamedType(listInner.ofType) : getNamedType(field.type);
  const flattenScalars = isScalarType(leaf) || isEnumType(leaf);
  const fieldName = field.name;
  const leafName = leaf.name;
  field.resolve = function xmlListPluralization(root) {
    let result = root?.[fieldName];
    if (result == null) return result;
    if (!Array.isArray(result)) {
      result = [result];
    }
    if (!flattenScalars) {
      return result;
    }
    return result
      .flat(Infinity)
      .map(item => coerceXmlLeafForGraphQLType(unwrapXmlScalarLeaf(item), leafName));
  };
}

/**
 * Singular scalar/enum fields: deferred unwrap of attributed XML leaves
 * (`{ innerText, attributes }` / attributes-only nil) after selection can read attributes.
 * Then coerce by GraphQL type so `ID`/`String` keep lexical text (`true`, `00123`).
 * `unwrapXmlScalarLeaf` no-ops on non-XML values (JSON `{ attributes: ... }` stays).
 */
function installXmlScalarUnwrap(field: GraphQLField<any, any>) {
  if (field.resolve && field.resolve.name !== 'defaultFieldResolver') return;
  if (isListTypeOrNonNullListType(field.type)) return;
  const named = getNamedType(field.type);
  if (!isScalarType(named) && !isEnumType(named)) return;
  const fieldName = field.name;
  const typeName = named.name;
  field.resolve = function xmlScalarUnwrap(root) {
    return coerceXmlLeafForGraphQLType(unwrapXmlScalarLeaf(root?.[fieldName]), typeName);
  };
}
