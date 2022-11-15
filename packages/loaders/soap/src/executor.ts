import {
  execute,
  GraphQLFieldResolver,
  GraphQLOutputType,
  GraphQLResolveInfo,
  GraphQLSchema,
  isListType,
  isNonNullType,
} from 'graphql';
import { parse as parseXML, j2xParser as JSONToXMLConverter } from 'fast-xml-parser';
import { MeshFetch } from '@graphql-mesh/types';
import { PARSE_XML_OPTIONS, SoapAnnotations } from './utils.js';
import { Executor, getDirective, getRootTypes } from '@graphql-tools/utils';

function isOriginallyListType(type: GraphQLOutputType): boolean {
  if (isNonNullType(type)) {
    return isOriginallyListType(type.ofType);
  }
  return isListType(type);
}

const defaultFieldResolver: GraphQLFieldResolver<any, any> = function soapDefaultResolver(root, args, context, info) {
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

function createRootValueMethod(soapAnnotations: SoapAnnotations, fetchFn: MeshFetch): RootValueMethod {
  const jsonToXMLConverter = new JSONToXMLConverter({
    attributeNamePrefix: '',
    attrNodeName: 'attributes',
    textNodeName: 'innerText',
  });

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
    const requestXML = jsonToXMLConverter.parse(requestJson);
    const response = await fetchFn(
      soapAnnotations.baseUrl,
      {
        method: 'POST',
        body: requestXML,
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
        },
      },
      context,
      info
    );
    const responseXML = await response.text();
    const responseJSON = parseXML(responseXML, PARSE_XML_OPTIONS);
    return normalizeResult(responseJSON.Envelope[0].Body[0][soapAnnotations.elementName]);
  };
}

function createRootValue(schema: GraphQLSchema, fetchFn: MeshFetch) {
  const rootValue: Record<string, RootValueMethod> = {};
  const rootTypes = getRootTypes(schema);
  for (const rootType of rootTypes) {
    const rootFieldMap = rootType.getFields();
    for (const fieldName in rootFieldMap) {
      const annotations = getDirective(schema, rootFieldMap[fieldName], 'soap');
      const soapAnnotations: SoapAnnotations = Object.assign({}, ...annotations);
      rootValue[fieldName] = createRootValueMethod(soapAnnotations, fetchFn);
    }
  }
  return rootValue;
}

export function createExecutorFromSchemaAST(schema: GraphQLSchema, fetchFn: MeshFetch) {
  let rootValue: Record<string, RootValueMethod>;
  return function soapExecutor({ document, variables, context }) {
    if (!rootValue) {
      rootValue = createRootValue(schema, fetchFn);
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
