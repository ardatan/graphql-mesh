import { XMLBuilder as JSONToXMLConverter, XMLParser } from 'fast-xml-parser';
import {
  execute,
  GraphQLFieldResolver,
  GraphQLOutputType,
  GraphQLResolveInfo,
  GraphQLSchema,
  isListType,
  isNonNullType,
} from 'graphql';
import { process } from '@graphql-mesh/cross-helpers';
import {
  getInterpolatedHeadersFactory,
  ResolverDataBasedFactory,
} from '@graphql-mesh/string-interpolation';
import { MeshFetch } from '@graphql-mesh/types';
import { Executor, getDirective, getRootTypes } from '@graphql-tools/utils';
import { PARSE_XML_OPTIONS, SoapAnnotations } from './utils.js';

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

interface CreateRootValueMethodOpts {
  soapAnnotations: SoapAnnotations;
  fetchFn: MeshFetch;
  jsonToXMLConverter: JSONToXMLConverter;
  xmlToJSONConverter: XMLParser;
  operationHeadersFactory: ResolverDataBasedFactory<Record<string, string>>;
}

function createRootValueMethod({
  soapAnnotations,
  fetchFn,
  jsonToXMLConverter,
  xmlToJSONConverter,
  operationHeadersFactory,
}: CreateRootValueMethodOpts): RootValueMethod {
  return async function rootValueMethod(args: any, context: any, info: GraphQLResolveInfo) {
    const requestJson = {
      'soap:Envelope': {
        attributes: {
          'xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
        },
        'soap:Body': {
          attributes: {
            xmlns: soapAnnotations.bindingNamespace,
          },
          ...normalizeArgsForConverter(args),
        },
      },
    };
    const requestXML = jsonToXMLConverter.build(requestJson);
    const response = await fetchFn(
      soapAnnotations.endpoint,
      {
        method: 'POST',
        body: requestXML,
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
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
    const responseJSON = xmlToJSONConverter.parse(responseXML, PARSE_XML_OPTIONS);
    return normalizeResult(responseJSON.Envelope[0].Body[0][soapAnnotations.elementName]);
  };
}

function createRootValue(
  schema: GraphQLSchema,
  fetchFn: MeshFetch,
  operationHeaders: Record<string, string> = {},
) {
  const rootValue: Record<string, RootValueMethod> = {};
  const rootTypes = getRootTypes(schema);

  const jsonToXMLConverter = new JSONToXMLConverter({
    attributeNamePrefix: '',
    attributesGroupName: 'attributes',
    textNodeName: 'innerText',
  });
  const xmlToJSONConverter = new XMLParser(PARSE_XML_OPTIONS);

  const operationHeadersFactory = getInterpolatedHeadersFactory(operationHeaders);
  for (const rootType of rootTypes) {
    const rootFieldMap = rootType.getFields();
    for (const fieldName in rootFieldMap) {
      const annotations = getDirective(schema, rootFieldMap[fieldName], 'soap');
      if (!annotations) {
        // skip fields without @soap directive
        // we have to skip Query.placeholder field when only mutations were created
        continue;
      }
      const soapAnnotations: SoapAnnotations = Object.assign({}, ...annotations);
      rootValue[fieldName] = createRootValueMethod({
        soapAnnotations,
        fetchFn,
        jsonToXMLConverter,
        xmlToJSONConverter,
        operationHeadersFactory,
      });
    }
  }
  return rootValue;
}

export function createExecutorFromSchemaAST(
  schema: GraphQLSchema,
  fetchFn: MeshFetch,
  operationHeaders: Record<string, string> = {},
) {
  let rootValue: Record<string, RootValueMethod>;
  return function soapExecutor({ document, variables, context }) {
    if (!rootValue) {
      rootValue = createRootValue(schema, fetchFn, operationHeaders);
    }
    return execute({
      schema,
      document,
      rootValue,
      contextValue: context,
      variableValues: variables,
      fieldResolver: defaultFieldResolver,
    });
  } as Executor;
}
