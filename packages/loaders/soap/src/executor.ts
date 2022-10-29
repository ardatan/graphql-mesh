import {
  buildASTSchema,
  DocumentNode,
  execute,
  GraphQLFieldResolver,
  GraphQLOutputType,
  GraphQLResolveInfo,
  isListType,
  isNonNullType,
  visit,
} from 'graphql';
import { parse as parseXML, j2xParser as JSONToXMLConverter } from 'fast-xml-parser';
import { MeshFetch } from '@graphql-mesh/types';
import { PARSE_XML_OPTIONS, SoapAnnotations } from './utils';
import { Executor } from '@graphql-tools/utils';

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

function createRootValue(schemaAST: DocumentNode, fetchFn: MeshFetch) {
  const rootValue: Record<string, RootValueMethod> = {};
  visit(schemaAST, {
    FieldDefinition(node) {
      const soapAnnotationsDirective = node.directives.find(directive => directive.name.value === 'soap');
      if (soapAnnotationsDirective) {
        const soapAnnotations: SoapAnnotations = {
          elementName: '',
          bindingNamespace: '',
          baseUrl: '',
        };
        for (const arg of soapAnnotationsDirective.arguments) {
          if ('value' in arg.value) {
            soapAnnotations[arg.name.value] = arg.value.value;
          }
        }
        rootValue[node.name.value] = createRootValueMethod(soapAnnotations, fetchFn);
      }
    },
  });
  return rootValue;
}

export function createExecutorFromSchemaAST(schemaAST: DocumentNode, fetchFn: MeshFetch) {
  const rootValue = createRootValue(schemaAST, fetchFn);
  const schema = buildASTSchema(schemaAST);
  return function soapExecutor({ document, variables, context }) {
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
