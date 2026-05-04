import { XMLBuilder as JSONToXMLConverter, XMLParser } from 'fast-xml-parser';
import type {
  GraphQLFieldResolver,
  GraphQLInputObjectType,
  GraphQLOutputType,
  GraphQLResolveInfo,
  GraphQLSchema,
  GraphQLType,
} from 'graphql';
import { getNamedType, isInputObjectType, isListType, isNonNullType } from 'graphql';
import { process } from '@graphql-mesh/cross-helpers';
import type { ResolverData, ResolverDataBasedFactory } from '@graphql-mesh/string-interpolation';
import {
  getInterpolatedHeadersFactory,
  stringInterpolator,
} from '@graphql-mesh/string-interpolation';
import type { Logger, MeshFetch } from '@graphql-mesh/types';
import { DefaultLogger } from '@graphql-mesh/utils';
import { normalizedExecutor } from '@graphql-tools/executor';
import {
  createGraphQLError,
  getDirectiveExtensions,
  getRootTypes,
  type Executor,
} from '@graphql-tools/utils';
import { fetch as defaultFetchFn } from '@whatwg-node/fetch';
import { parseXmlOptions } from './parseXmlOptions.js';

function isOriginallyListType(type: GraphQLOutputType): boolean {
  if (isNonNullType(type)) {
    return isOriginallyListType(type.ofType);
  }
  return isListType(type);
}

const defaultFieldResolver: GraphQLFieldResolver<any, any> = function soapDefaultResolver(
  root,
  args,
  context,
  info,
) {
  const rootField = root[info.fieldName];
  if (typeof rootField === 'function') {
    return rootField(args, context, info);
  }
  const fieldValue = rootField;
  const isArray = Array.isArray(fieldValue);
  const isPlural = isOriginallyListType(info.returnType);
  if (isPlural && !isArray) {
    return [fieldValue];
  }
  if (!isPlural && isArray) {
    return fieldValue[0];
  }
  return fieldValue;
};

function normalizeArgsForConverter(args: any): any {
  if (args != null) {
    if (Array.isArray(args)) {
      return args.map(normalizeArgsForConverter);
    }
    if (typeof args === 'object') {
      for (const key in args) {
        args[key] = normalizeArgsForConverter(args[key]);
      }
    } else {
      return {
        innerText: args,
      };
    }
  }
  return args;
}

function normalizeResult(result: any) {
  if (result != null && typeof result === 'object') {
    for (const key in result) {
      if (key === 'innerText') {
        return result.innerText;
      }
      result[key] = normalizeResult(result[key]);
    }
    if (Array.isArray(result) && result.length === 1) {
      return result[0];
    }
  }
  return result;
}

type RootValueMethod = (args: any, context: any, info: GraphQLResolveInfo) => Promise<any>;

interface SoapAnnotations {
  subgraph: string;
  endpoint: string;
  bindingNamespace: string;
  elementName: string;
  soapNamespace: string;
  bodyAlias?: string;
  soapHeaders?: {
    alias?: string;
    namespace: string;
    headers: Record<string, string>;
  };
  soapAction?: string;
  headerArgNames?: string[];
  argNamespacesJson?: string;
}

interface CreateRootValueMethodOpts {
  soapAnnotations: SoapAnnotations;
  fetchFn: MeshFetch;
  jsonToXMLConverter: JSONToXMLConverter;
  xmlToJSONConverter: XMLParser;
  operationHeadersFactory: ResolverDataBasedFactory<Record<string, string>>;
  logger: Logger;
}

// Recursive: returns an array for array inputs, an object with prefixed keys
// for object inputs, an interpolated string for string inputs, or the value
// unchanged for other primitives. Typed as `any` because the shape mirrors
// whatever the caller passed in.
function prefixWithAlias({
  alias,
  obj,
  resolverData,
}: {
  alias: string;
  obj: unknown;
  resolverData?: ResolverData;
}): any {
  if (Array.isArray(obj)) {
    return obj.map(item => prefixWithAlias({ alias, obj: item, resolverData }));
  }
  if (typeof obj === 'object' && obj !== null) {
    const prefixedHeaderObj: Record<string, any> = {};
    for (const key in obj) {
      const aliasedKey = key === 'innerText' ? key : `${alias}:${key}`;
      prefixedHeaderObj[aliasedKey] = prefixWithAlias({
        alias,
        obj: (obj as Record<string, unknown>)[key],
        resolverData,
      });
    }
    return prefixedHeaderObj;
  }
  if (typeof obj === 'string' && resolverData) {
    return stringInterpolator.parse(obj, resolverData);
  }
  return obj;
}

// Prefixes reserved by the XML/XML Namespaces specs — must never be bound.
const RESERVED_XML_PREFIXES = new Set(['xml', 'xmlns']);

/**
 * Derive a short, readable XML namespace prefix from a namespace URI.
 * Traverses path segments right-to-left, skipping version tokens (e.g. "v1"),
 * dotted hostnames (e.g. "www.example.com"), and reserved XML prefixes.
 * e.g. "http://www.tmforum.org/mtop/fmw/xsd/hdr/v1" → "hdr"
 *
 * Falls back to "body" so that schemas with a single XSD namespace and no
 * bodyAlias produce envelopes byte-compatible with the legacy code path.
 */
function deriveXmlPrefix(nsUri: string): string {
  const path = nsUri.replace(/^https?:\/\//, '');
  const segments = path.split(/[/-]/).filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (/^v\d/.test(seg)) continue;
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(seg)) continue;
    if (seg.length <= 1) continue;
    const candidate = seg.toLowerCase().substring(0, 20);
    if (RESERVED_XML_PREFIXES.has(candidate)) continue;
    return candidate;
  }
  return 'body';
}

/**
 * Return (or lazily assign) a unique XML namespace prefix for nsUri.
 * Collision-free: appends a numeric suffix if the derived base name is taken.
 */
function getOrAssignPrefix(
  nsUri: string,
  assigned: Map<string, string>,
  envelopeAttrs: Record<string, string>,
): string {
  const existing = assigned.get(nsUri);
  if (existing) return existing;
  const base = deriveXmlPrefix(nsUri);
  let prefix = base;
  let i = 2;
  while (envelopeAttrs[`xmlns:${prefix}`] !== undefined) {
    prefix = `${base}${i++}`;
  }
  assigned.set(nsUri, prefix);
  envelopeAttrs[`xmlns:${prefix}`] = nsUri;
  return prefix;
}

/**
 * Recursively build an XML-ready object from a GraphQL arg value.
 * Uses the parent GraphQL type's XSD namespace (from typeNamespaceMap) to qualify
 * child element names, so each field gets the prefix of the schema where it is declared.
 */
function buildValueXml(
  value: unknown,
  graphqlType: GraphQLType | undefined,
  typeNamespaceMap: Map<string, string>,
  assigned: Map<string, string>,
  envelopeAttrs: Record<string, string>,
  resolverData: ResolverData,
): unknown {
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map(item =>
      buildValueXml(item, graphqlType, typeNamespaceMap, assigned, envelopeAttrs, resolverData),
    );
  }

  if (typeof value === 'object') {
    const namedType = graphqlType ? getNamedType(graphqlType) : null;
    const typeNsUri = namedType ? typeNamespaceMap.get(namedType.name) : null;
    const nsPrefix = typeNsUri ? getOrAssignPrefix(typeNsUri, assigned, envelopeAttrs) : null;

    const result: Record<string, unknown> = {};
    if (namedType && isInputObjectType(namedType)) {
      const fields = (namedType as GraphQLInputObjectType).getFields();
      for (const key of Object.keys(value as object)) {
        const fieldType = fields[key]?.type;
        const xmlKey = nsPrefix ? `${nsPrefix}:${key}` : key;
        result[xmlKey] = buildValueXml(
          (value as any)[key],
          fieldType,
          typeNamespaceMap,
          assigned,
          envelopeAttrs,
          resolverData,
        );
      }
    } else {
      for (const key of Object.keys(value as object)) {
        result[key] = buildValueXml(
          (value as any)[key],
          undefined,
          typeNamespaceMap,
          assigned,
          envelopeAttrs,
          resolverData,
        );
      }
    }
    return result;
  }

  return {
    innerText:
      typeof value === 'string' ? stringInterpolator.parse(value, resolverData) : String(value),
  };
}

/**
 * Wrap a single top-level arg in its namespace-qualified element name and build its content.
 */
function buildArgXml(
  argName: string,
  argValue: unknown,
  nsUri: string | undefined,
  argType: GraphQLType | undefined,
  typeNamespaceMap: Map<string, string>,
  assigned: Map<string, string>,
  envelopeAttrs: Record<string, string>,
  resolverData: ResolverData,
): Record<string, unknown> {
  const prefix = nsUri ? getOrAssignPrefix(nsUri, assigned, envelopeAttrs) : null;
  const xmlKey = prefix ? `${prefix}:${argName}` : argName;
  return {
    [xmlKey]: buildValueXml(
      argValue,
      argType,
      typeNamespaceMap,
      assigned,
      envelopeAttrs,
      resolverData,
    ),
  };
}

function createRootValueMethod({
  soapAnnotations,
  fetchFn,
  jsonToXMLConverter,
  xmlToJSONConverter,
  operationHeadersFactory,
  logger,
}: CreateRootValueMethodOpts): RootValueMethod {
  if (!soapAnnotations.soapNamespace) {
    logger.warn(`The expected 'soapNamespace' attribute is missing in SOAP directive definition.
Update the SOAP source handler, and re-generate the schema.
Falling back to 'http://www.w3.org/2003/05/soap-envelope' as SOAP Namespace.`);
    soapAnnotations.soapNamespace = 'http://www.w3.org/2003/05/soap-envelope';
  }
  return async function rootValueMethod(args: any, context: any, info: GraphQLResolveInfo) {
    const envelopeAttributes: Record<string, string> = {
      'xmlns:soap': soapAnnotations.soapNamespace,
    };
    const envelope: Record<string, any> = {
      attributes: envelopeAttributes,
    };
    const resolverData: ResolverData = {
      args,
      context,
      info,
      env: process.env,
    };

    const typeNamespaceMap: Map<string, string> | undefined = (info.schema.extensions as any)
      ?.typeNamespaceMap;

    if (soapAnnotations.argNamespacesJson && !soapAnnotations.bodyAlias && typeNamespaceMap) {
      // Namespace-aware mode: each arg/field gets the XSD namespace of its declaring schema.
      // WSDL-declared soap:header parts are routed to soap:Header; the rest go to soap:Body.
      const argNsMap: Record<string, string> = JSON.parse(soapAnnotations.argNamespacesJson);
      const headerArgSet = new Set(soapAnnotations.headerArgNames ?? []);
      const fieldDef = info.parentType.getFields()[info.fieldName];
      const argTypeMap = Object.fromEntries(fieldDef.args.map(a => [a.name, a.type]));
      const assigned = new Map<string, string>();
      const headerContent: Record<string, unknown> = {};
      const bodyContent: Record<string, unknown> = {};

      for (const [argName, argValue] of Object.entries(args ?? {})) {
        const chunk = buildArgXml(
          argName,
          argValue,
          argNsMap[argName],
          argTypeMap[argName],
          typeNamespaceMap,
          assigned,
          envelopeAttributes,
          resolverData,
        );
        if (headerArgSet.has(argName)) {
          Object.assign(headerContent, chunk);
        } else {
          Object.assign(bodyContent, chunk);
        }
      }

      // User-configured soapHeaders (from YAML/config) are merged into soap:Header.
      if (soapAnnotations.soapHeaders?.headers) {
        const cfgAlias = soapAnnotations.soapHeaders.alias ?? 'header';
        if (soapAnnotations.soapHeaders.namespace) {
          envelopeAttributes[`xmlns:${cfgAlias}`] = soapAnnotations.soapHeaders.namespace;
        }
        Object.assign(
          headerContent,
          prefixWithAlias({
            alias: cfgAlias,
            obj: normalizeArgsForConverter(
              typeof soapAnnotations.soapHeaders.headers === 'string'
                ? JSON.parse(soapAnnotations.soapHeaders.headers)
                : soapAnnotations.soapHeaders.headers,
            ),
            resolverData,
          }),
        );
      }

      if (Object.keys(headerContent).length > 0) {
        envelope['soap:Header'] = headerContent;
      }
      envelope['soap:Body'] = bodyContent;
    } else {
      // Legacy mode: single alias prefix for all args (preserves existing behavior exactly).
      const bodyPrefix = soapAnnotations.bodyAlias ?? 'body';
      envelopeAttributes[`xmlns:${bodyPrefix}`] = soapAnnotations.bindingNamespace;

      const headerPrefix =
        soapAnnotations.soapHeaders?.alias ?? soapAnnotations.bodyAlias ?? 'header';
      if (soapAnnotations.soapHeaders?.headers) {
        envelope['soap:Header'] = prefixWithAlias({
          alias: headerPrefix,
          obj: normalizeArgsForConverter(
            typeof soapAnnotations.soapHeaders.headers === 'string'
              ? JSON.parse(soapAnnotations.soapHeaders.headers)
              : soapAnnotations.soapHeaders.headers,
          ),
          resolverData,
        });
        if (soapAnnotations.soapHeaders?.namespace) {
          envelopeAttributes[`xmlns:${headerPrefix}`] = soapAnnotations.soapHeaders.namespace;
        }
      }

      envelope['soap:Body'] = prefixWithAlias({
        alias: bodyPrefix,
        obj: normalizeArgsForConverter(args),
        resolverData,
      });
    }

    const requestJson = {
      'soap:Envelope': envelope,
    };
    const requestXML = jsonToXMLConverter.build(requestJson);
    const currentFetchFn = context?.fetch || fetchFn;
    const response = await currentFetchFn(
      soapAnnotations.endpoint,
      {
        method: 'POST',
        body: requestXML,
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: soapAnnotations.soapAction,
          ...operationHeadersFactory({
            args,
            context,
            info,
            env: process.env,
          }),
        },
      },
      context,
      info,
    );
    const responseXML = await response.text();
    if (!response.ok) {
      return createGraphQLError(`Upstream HTTP Error: ${response.status}`, {
        extensions: {
          code: 'DOWNSTREAM_SERVICE_ERROR',
          serviceName: soapAnnotations.subgraph,
          request: {
            url: soapAnnotations.endpoint,
            method: 'POST',
            body: requestXML,
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            get headers() {
              return Object.fromEntries(response.headers.entries());
            },
            body: responseXML,
          },
        },
      });
    }
    try {
      const responseJSON = xmlToJSONConverter.parse(responseXML, parseXmlOptions);
      return normalizeResult(responseJSON.Envelope[0].Body[0][soapAnnotations.elementName]);
    } catch (e) {
      return createGraphQLError(`Invalid SOAP response: ${e.message}`, {
        extensions: {
          subgraph: soapAnnotations.subgraph,
          request: {
            url: soapAnnotations.endpoint,
            method: 'POST',
            body: requestXML,
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            get headers() {
              return Object.fromEntries(response.headers.entries());
            },
            body: responseXML,
          },
        },
      });
    }
  };
}

function createRootValue(
  schema: GraphQLSchema,
  fetchFn: MeshFetch,
  operationHeaders: Record<string, string>,
  logger: Logger,
) {
  const rootValue: Record<string, RootValueMethod> = {};
  const rootTypes = getRootTypes(schema);

  const jsonToXMLConverter = new JSONToXMLConverter({
    attributeNamePrefix: '',
    attributesGroupName: 'attributes',
    textNodeName: 'innerText',
  });
  const xmlToJSONConverter = new XMLParser(parseXmlOptions);

  const operationHeadersFactory = getInterpolatedHeadersFactory(operationHeaders);
  for (const rootType of rootTypes) {
    const rootFieldMap = rootType.getFields();
    for (const fieldName in rootFieldMap) {
      const fieldDirectives = getDirectiveExtensions<{
        soap: SoapAnnotations;
      }>(rootFieldMap[fieldName]);
      const soapDirectives = fieldDirectives?.soap;
      if (!soapDirectives?.length) {
        // skip fields without @soap directive
        // we have to skip Query.placeholder field when only mutations were created
        continue;
      }
      for (const soapAnnotations of soapDirectives) {
        rootValue[fieldName] = createRootValueMethod({
          soapAnnotations,
          fetchFn,
          jsonToXMLConverter,
          xmlToJSONConverter,
          operationHeadersFactory,
          logger,
        });
      }
    }
  }
  return rootValue;
}

export function createExecutorFromSchemaAST(
  schema: GraphQLSchema,
  fetchFn: MeshFetch = defaultFetchFn,
  operationHeaders: Record<string, string> = {},
  logger: Logger = new DefaultLogger(),
): Executor {
  let rootValue: Record<string, RootValueMethod>;
  return function soapExecutor({ document, variables, context }) {
    if (!rootValue) {
      rootValue = createRootValue(schema, fetchFn, operationHeaders, logger);
    }
    return normalizedExecutor({
      schema,
      document,
      rootValue,
      contextValue: context,
      variableValues: variables,
      fieldResolver: defaultFieldResolver,
    });
  };
}
