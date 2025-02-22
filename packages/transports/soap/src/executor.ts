import { XMLBuilder as JSONToXMLConverter, XMLParser } from 'fast-xml-parser';
import type {
  GraphQLFieldResolver,
  GraphQLOutputType,
  GraphQLResolveInfo,
  GraphQLSchema,
} from 'graphql';
import { isListType, isNonNullType } from 'graphql';
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
}

interface CreateRootValueMethodOpts {
  soapAnnotations: SoapAnnotations;
  fetchFn: MeshFetch;
  jsonToXMLConverter: JSONToXMLConverter;
  xmlToJSONConverter: XMLParser;
  operationHeadersFactory: ResolverDataBasedFactory<Record<string, string>>;
  logger: Logger;
}

function prefixWithAlias({
  alias,
  obj,
  resolverData,
}: {
  alias: string;
  obj: unknown;
  resolverData?: ResolverData;
}): Record<string, any> {
  if (typeof obj === 'object' && obj !== null) {
    const prefixedHeaderObj: Record<string, any> = {};
    for (const key in obj) {
      const aliasedKey = key === 'innerText' ? key : `${alias}:${key}`;
      prefixedHeaderObj[aliasedKey] = prefixWithAlias({
        alias,
        obj: obj[key],
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

    const bodyPrefix = soapAnnotations.bodyAlias || 'body';
    envelopeAttributes[`xmlns:${bodyPrefix}`] = soapAnnotations.bindingNamespace;

    const headerPrefix =
      soapAnnotations.soapHeaders?.alias || soapAnnotations.bodyAlias || 'header';
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

    const body = prefixWithAlias({
      alias: bodyPrefix,
      obj: normalizeArgsForConverter(args),
      resolverData,
    });
    envelope['soap:Body'] = body;

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
