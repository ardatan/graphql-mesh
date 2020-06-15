/* eslint-disable no-unused-expressions */
import { MeshHandlerLibrary, YamlConfig, ResolverData } from '@graphql-mesh/types';
import { parseInterpolationStrings, getInterpolatedHeadersFactory } from '@graphql-mesh/utils';
import { fetchache, Request, Response } from 'fetchache';
import urljoin from 'url-join';
import { JSDOM } from 'jsdom';
import {
  SchemaComposer,
  ObjectTypeComposer,
  InterfaceTypeComposer,
  ObjectTypeComposerFieldConfigDefinition,
  ObjectTypeComposerArgumentConfigMapDefinition,
  EnumTypeComposerValueConfigDefinition,
  InputTypeComposer,
} from 'graphql-compose';
import { GraphQLBigInt, GraphQLGUID, GraphQLDateTime, GraphQLJSON } from 'graphql-scalars';
import { isListType, GraphQLResolveInfo, isAbstractType, GraphQLObjectType, GraphQLSchema } from 'graphql';
import { parseResolveInfo, ResolveTree, simplifyParsedResolveInfoFragmentWithType } from 'graphql-parse-resolve-info';
import DataLoader from 'dataloader';
import { parseResponse } from 'http-string-parser';
import { nativeFetch } from './native-fetch';
import { pascalCase } from 'pascal-case';

const SCALARS = new Map<string, string>([
  ['Edm.Binary', 'String'],
  ['Edm.Stream', 'String'],
  ['Edm.String', 'String'],
  ['Edm.Int16', 'Int'],
  ['Edm.Byte', 'Int'],
  ['Edm.Int32', 'Int'],
  ['Edm.Int64', 'BigInt'],
  ['Edm.Double', 'Float'],
  ['Edm.Boolean', 'Boolean'],
  ['Edm.Guid', 'GUID'],
  ['Edm.DateTimeOffset', 'String'],
  ['Edm.Date', 'DateTime'],
  ['Edm.TimeOfDay', 'String'],
  ['Edm.Single', 'Float'],
  ['Edm.Duration', 'String'],
  ['Edm.Decimal', 'Float'],
  ['Edm.SByte', 'Int'],
  ['Edm.GeographyPoint', 'String'],
]);

interface EntityTypeExtensions {
  entityInfo: {
    actualFields: string[];
    navigationFields: string[];
    identifierFieldName?: string;
    identifierFieldTypeRef?: string;
  };
  typeElement: Element;
}

const handler: MeshHandlerLibrary<YamlConfig.ODataHandler> = {
  async getMeshSource({ name, config, cache }) {
    const metadataUrl = urljoin(config.baseUrl, '$metadata');
    const metadataRequest = new Request(metadataUrl, {
      headers: config.schemaHeaders,
    });

    const response = await fetchache(metadataRequest, cache);
    const text = await response.text();
    const {
      window: { document: allDocument },
    } = new JSDOM(text, {
      contentType: 'text/xml',
    });

    const schemaComposer = new SchemaComposer();
    schemaComposer.add(GraphQLBigInt);
    schemaComposer.add(GraphQLGUID);
    schemaComposer.add(GraphQLDateTime);
    schemaComposer.add(GraphQLJSON);

    const aliasNamespaceMap = new Map<string, string>();

    const schemas = allDocument.querySelectorAll('Schema');
    const multipleSchemas = schemas.length > 1;

    function getTypeNameFromRef({
      typeRef,
      isInput,
      isRequired,
      schemaNamespace,
    }: {
      typeRef: string;
      isInput: boolean;
      isRequired: boolean;
      schemaNamespace: string;
    }) {
      const typeRefArr = typeRef.split('Collection(');
      const arrayDepth = typeRefArr.length;
      let actualTypeRef = typeRefArr.join('').split(')').join('');
      const alias = aliasNamespaceMap.get(schemaNamespace) || schemaNamespace;
      if (typeRef.startsWith(schemaNamespace) && aliasNamespaceMap.has(schemaNamespace)) {
        actualTypeRef = actualTypeRef.replace(schemaNamespace, alias);
      }
      const actualTypeRefArr = actualTypeRef.split('.');
      const typeName = multipleSchemas
        ? pascalCase(actualTypeRefArr.join('_'))
        : actualTypeRefArr[actualTypeRefArr.length - 1];
      let realTypeName = typeName;
      if (SCALARS.has(actualTypeRef)) {
        realTypeName = SCALARS.get(actualTypeRef);
      } else if (schemaComposer.isEnumType(typeName)) {
        realTypeName = typeName;
      } else if (isInput) {
        realTypeName += 'Input';
      }
      const fakeEmptyArr = new Array(arrayDepth);
      realTypeName = fakeEmptyArr.join('[') + realTypeName + fakeEmptyArr.join(']');
      if (isRequired) {
        realTypeName += '!';
      }
      return realTypeName;
    }

    function prepareSearchParams(fragment: ResolveTree, schema: GraphQLSchema) {
      const fragmentTypeNames = Object.keys(fragment.fieldsByTypeName) as string[];
      const returnType = schema.getType(fragmentTypeNames[0]);
      const { args, fields } = simplifyParsedResolveInfoFragmentWithType(fragment, returnType);
      const searchParams = new URLSearchParams();
      if ('queryOptions' in args) {
        const { queryOptions } = args as any;
        for (const param in queryOptionsFields) {
          if (param in queryOptions) {
            searchParams.set('$' + param, queryOptions[param]);
          }
        }
      }

      // $select doesn't work with inherited types' fields. So if there is an inline fragment for
      // implemented types, we cannot use $select
      const isSelectable = !isAbstractType(returnType);

      if (isSelectable) {
        const { entityInfo } = returnType.extensions as EntityTypeExtensions;
        const selectionFields: string[] = [];
        const expandedFields: string[] = [];
        for (const fieldName in fields) {
          if (entityInfo.actualFields.includes(fieldName)) {
            selectionFields.push(fieldName);
          }
          if (config.expandNavProps && entityInfo.navigationFields.includes(fieldName)) {
            const searchParams = prepareSearchParams(fields[fieldName], schema);
            const searchParamsStr = decodeURIComponent(searchParams.toString());
            expandedFields.push(`${fieldName}(${searchParamsStr.split('&').join(';')})`);
            selectionFields.push(fieldName);
          }
        }
        if (!selectionFields.includes(entityInfo.identifierFieldName)) {
          selectionFields.push(entityInfo.identifierFieldName);
        }
        if (selectionFields.length) {
          searchParams.set('$select', selectionFields.join(','));
        }
        if (expandedFields.length) {
          searchParams.set('$expand', expandedFields.join(','));
        }
      }
      return searchParams;
    }

    function getUrlString(url: URL) {
      return decodeURIComponent(url.toString()).split('+').join(' ');
    }

    function handleResponseText(responseText: string, urlString: string, info: GraphQLResolveInfo) {
      let responseJson: any;
      try {
        responseJson = JSON.parse(responseText);
      } catch (error) {
        const actualError = new Error(responseText);
        Object.assign(actualError, {
          extensions: {
            url: urlString,
          },
        });
        throw actualError;
      }
      if (responseJson.error) {
        const actualError = new Error(responseJson.error.message || responseJson.error) as any;
        actualError.extensions = responseJson.error;
        throw actualError;
      }
      const urlStringWithoutSearchParams = urlString.split('?')[0];
      if (isListType(info.returnType)) {
        const actualReturnType: GraphQLObjectType = info.returnType.ofType;
        const entityTypeExtensions = actualReturnType.extensions as EntityTypeExtensions;
        if ('Message' in responseJson && !('value' in responseJson)) {
          const error = new Error(responseJson.Message);
          Object.assign(error, { extensions: responseJson });
          throw error;
        }
        const returnList: any[] = responseJson.value;
        return returnList.map(element => {
          if (!entityTypeExtensions?.entityInfo) {
            return element;
          }
          const urlOfElement = new URL(urlStringWithoutSearchParams);
          addIdentifierToUrl(
            urlOfElement,
            entityTypeExtensions.entityInfo.identifierFieldName,
            entityTypeExtensions.entityInfo.identifierFieldTypeRef,
            element
          );
          const identifierUrl = element['@odata.id'] || getUrlString(urlOfElement);
          const fieldMap = actualReturnType.getFields();
          for (const fieldName in element) {
            if (entityTypeExtensions.entityInfo.navigationFields.includes(fieldName)) {
              const field = element[fieldName];
              let fieldType = fieldMap[fieldName].type;
              if ('ofType' in fieldType) {
                fieldType = fieldType.ofType;
              }
              const { entityInfo: fieldEntityInfo } = (fieldType as any).extensions as EntityTypeExtensions;
              if (field instanceof Array) {
                for (const fieldElement of field) {
                  const urlOfField = new URL(urljoin(identifierUrl, fieldName));
                  addIdentifierToUrl(
                    urlOfField,
                    fieldEntityInfo.identifierFieldName,
                    fieldEntityInfo.identifierFieldTypeRef,
                    fieldElement
                  );
                  fieldElement['@odata.id'] = fieldElement['@odata.id'] || getUrlString(urlOfField);
                }
              } else {
                const urlOfField = new URL(urljoin(identifierUrl, fieldName));
                addIdentifierToUrl(
                  urlOfField,
                  fieldEntityInfo.identifierFieldName,
                  fieldEntityInfo.identifierFieldTypeRef,
                  field
                );
                field['@odata.id'] = field['@odata.id'] || getUrlString(urlOfField);
              }
            }
          }
          return {
            '@odata.id': identifierUrl,
            ...element,
          };
        });
      } else {
        const actualReturnType = info.returnType as GraphQLObjectType;
        const entityTypeExtensions = actualReturnType.extensions as EntityTypeExtensions;
        if (!entityTypeExtensions?.entityInfo) {
          return responseJson;
        }
        const identifierUrl = responseJson['@odata.id'] || urlStringWithoutSearchParams;
        const fieldMap = actualReturnType.getFields();
        for (const fieldName in responseJson) {
          if (entityTypeExtensions?.entityInfo.navigationFields.includes(fieldName)) {
            const field = responseJson[fieldName];
            let fieldType = fieldMap[fieldName].type;
            if ('ofType' in fieldType) {
              fieldType = fieldType.ofType;
            }
            const { entityInfo: fieldEntityInfo } = (fieldType as any).extensions as EntityTypeExtensions;
            if (field instanceof Array) {
              for (const fieldElement of field) {
                const urlOfField = new URL(urljoin(identifierUrl, fieldName));
                addIdentifierToUrl(
                  urlOfField,
                  fieldEntityInfo.identifierFieldName,
                  fieldEntityInfo.identifierFieldTypeRef,
                  fieldElement
                );
                fieldElement['@odata.id'] = fieldElement['@odata.id'] || getUrlString(urlOfField);
              }
            } else {
              const urlOfField = new URL(urljoin(identifierUrl, fieldName));
              addIdentifierToUrl(
                urlOfField,
                fieldEntityInfo.identifierFieldName,
                fieldEntityInfo.identifierFieldTypeRef,
                field
              );
              field['@odata.id'] = field['@odata.id'] || getUrlString(urlOfField);
            }
          }
        }
        return {
          '@odata.id': responseJson['@odata.id'] || urlStringWithoutSearchParams,
          ...responseJson,
        };
      }
    }

    schemaComposer.createEnumTC({
      name: 'InlineCount',
      values: {
        allpages: {
          value: 'allpages',
          description:
            'The OData MUST include a count of the number of entities in the collection identified by the URI (after applying any $filter System Query Options present on the URI)',
        },
        none: {
          value: 'none',
          description:
            'The OData service MUST NOT include a count in the response. This is equivalence to a URI that does not include a $inlinecount query string parameter.',
        },
      },
    });

    const queryOptionsFields = {
      orderby: {
        type: 'String',
        description:
          'A data service URI with a $orderby System Query Option specifies an expression for determining what values are used to order the collection of Entries identified by the Resource Path section of the URI. This query option is only supported when the resource path identifies a Collection of Entries.',
      },
      top: {
        type: 'Int',
        description:
          'A data service URI with a $top System Query Option identifies a subset of the Entries in the Collection of Entries identified by the Resource Path section of the URI. This subset is formed by selecting only the first N items of the set, where N is an integer greater than or equal to zero specified by this query option. If a value less than zero is specified, the URI should be considered malformed.',
      },
      skip: {
        type: 'Int',
        description:
          'A data service URI with a $skip System Query Option identifies a subset of the Entries in the Collection of Entries identified by the Resource Path section of the URI. That subset is defined by seeking N Entries into the Collection and selecting only the remaining Entries (starting with Entry N+1). N is an integer greater than or equal to zero specified by this query option. If a value less than zero is specified, the URI should be considered malformed.',
      },
      filter: {
        type: 'String',
        description:
          'A URI with a $filter System Query Option identifies a subset of the Entries from the Collection of Entries identified by the Resource Path section of the URI. The subset is determined by selecting only the Entries that satisfy the predicate expression specified by the query option.',
      },
      inlinecount: {
        type: 'InlineCount',
        description:
          'A URI with a $inlinecount System Query Option specifies that the response to the request includes a count of the number of Entries in the Collection of Entries identified by the Resource Path section of the URI. The count must be calculated after applying any $filter System Query Options present in the URI. The set of valid values for the $inlinecount query option are shown in the table below. If a value other than one shown in Table 4 is specified the URI is considered malformed.',
      },
    };

    schemaComposer.createInputTC({
      name: 'QueryOptions',
      fields: queryOptionsFields,
    });

    const origHeadersFactory = getInterpolatedHeadersFactory(config.operationHeaders);
    const headersFactory = (resolverData: ResolverData, method: string) => {
      const headers = origHeadersFactory(resolverData);
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
      }
      if (!headers.has('Content-Type') && method !== 'GET') {
        headers.set('Content-Type', 'application/json');
      }
      return headers;
    };
    const { args: commonArgs, contextVariables } = parseInterpolationStrings([
      ...Object.values(config.operationHeaders || {}),
      config.baseUrl,
    ]);

    function getTCByTypeNames(...typeNames: string[]) {
      for (const typeName of typeNames) {
        try {
          return schemaComposer.getAnyTC(typeName);
        } catch {}
      }
      return null;
    }

    function addIdentifierToUrl(url: URL, identifierFieldName: string, identifierFieldTypeRef: string, args: any) {
      if (identifierFieldTypeRef.includes('String')) {
        url.href += `('${args[identifierFieldName]}')`;
      } else {
        url.href += `(${args[identifierFieldName]})`;
      }
    }

    function rebuildOpenInputObjects(input: any) {
      if (typeof input === 'object') {
        if ('rest' in input) {
          Object.assign(input, input.rest);
          delete input.rest;
        }
        for (const fieldName in input) {
          rebuildOpenInputObjects(input[fieldName]);
        }
      }
    }

    const DATALOADER_FACTORIES = {
      multipart: (context: any) =>
        new DataLoader(
          async (requests: Request[]): Promise<Response[]> => {
            let requestBody = '';
            const requestBoundary = 'batch_' + Date.now();
            for (const requestIndex in requests) {
              requestBody += `--${requestBoundary}\n`;
              const request = requests[requestIndex];
              requestBody += `Content-Type: application/http\n`;
              requestBody += `Content-Transfer-Encoding:binary\n`;
              requestBody += `Content-ID: ${requestIndex}\n\n`;
              requestBody += `${request.method} ${request.url} HTTP/1.1\n`;
              request.headers.forEach((value, key) => {
                requestBody += `${key}: ${value}\n`;
              });
              if (request.body) {
                const bodyAsStr = await request.text();
                requestBody += `Content-Length: ${bodyAsStr.length}`;
                requestBody += `\n`;
                requestBody += bodyAsStr;
              }
              requestBody += `\n`;
            }
            requestBody += `--${requestBoundary}--\n`;
            const batchHeaders = headersFactory({ context }, 'POST');
            batchHeaders.set('Content-Type', `multipart/mixed;boundary=${requestBoundary}`);
            const batchRequest = new Request(urljoin(config.baseUrl, '$batch'), {
              method: 'POST',
              body: requestBody,
              headers: batchHeaders,
            });
            const batchResponse = await nativeFetch(batchRequest);
            const batchResponseText = await batchResponse.text();
            const responseLines = batchResponseText.split('\n');
            const responseBoundary = responseLines[0];
            if (!responseBoundary.startsWith('--')) {
              return requests.map(() => batchResponse);
            }
            const actualResponse = responseLines.slice(1, responseLines.length - 2).join('\n');
            const responseTextArr = actualResponse.split(responseBoundary);
            return responseTextArr.map(responseTextWithContentHeader => {
              const responseText = responseTextWithContentHeader.split('\n').slice(4).join('\n');
              const { body, headers, statusCode, statusMessage } = parseResponse(responseText);
              return new Response(body, {
                headers,
                status: parseInt(statusCode),
                statusText: statusMessage,
              });
            });
          }
        ),
      json: (context: any) =>
        new DataLoader(
          async (requests: Request[]): Promise<Response[]> => {
            const batchHeaders = headersFactory({ context }, 'POST');
            batchHeaders.set('Content-Type', 'application/json');
            const batchRequest = new Request(urljoin(config.baseUrl, '$batch'), {
              method: 'POST',
              body: JSON.stringify({
                requests: await Promise.all(
                  requests.map(async (request, index) => {
                    const id = index.toString();
                    const url = request.url.replace(config.baseUrl, '');
                    const method = request.method;
                    const headers: HeadersInit = {};
                    request.headers.forEach((value, key) => {
                      headers[key] = value;
                    });
                    return {
                      id,
                      url,
                      method,
                      body: request.body && (await request.json()),
                      headers,
                    };
                  })
                ),
              }),
              headers: batchHeaders,
            });
            const batchResponse = await fetchache(batchRequest, cache);
            const batchResponseText = await batchResponse.text();
            const batchResponseJson = JSON.parse(batchResponseText);
            return requests.map((_req, index) => {
              if (!('responses' in batchResponseJson)) {
                return batchResponse;
              }
              const responseObj = batchResponseJson.responses.find((res: any) => res.id === index.toString());
              return new Response(JSON.stringify(responseObj.body), {
                status: responseObj.status,
                headers: responseObj.headers,
              });
            });
          }
        ),
      none: () => ({
        load: (request: any) => fetchache(request, cache),
      }),
    };

    const dataLoaderFactory = DATALOADER_FACTORIES[config.batch || 'none'];

    function buildName({ schemaNamespace, name }: { schemaNamespace: string; name: string }) {
      const alias = aliasNamespaceMap.get(schemaNamespace) || schemaNamespace;
      const ref = alias + '.' + name;
      return multipleSchemas ? pascalCase(ref.split('.').join('_')) : name;
    }

    schemas.forEach(schemaElement => {
      const schemaNamespace = schemaElement.getAttribute('Namespace');
      const schemaAlias = schemaElement.getAttribute('Alias');
      if (schemaAlias) {
        aliasNamespaceMap.set(schemaNamespace, schemaAlias);
      }

      schemaElement.querySelectorAll('EnumType').forEach(enumElement => {
        const values: Record<string, EnumTypeComposerValueConfigDefinition> = {};
        enumElement.querySelectorAll('Member').forEach(memberElement => {
          const key = memberElement.getAttribute('Name')!;
          // This doesn't work.
          // const value = memberElement.getAttribute('Value')!;
          values[key] = {
            value: key,
            extensions: { memberElement },
          };
        });
        const enumTypeName = buildName({ schemaNamespace, name: enumElement.getAttribute('Name') });
        schemaComposer.createEnumTC({
          name: enumTypeName,
          values,
          extensions: { enumElement },
        });
      });

      schemaElement.querySelectorAll('EntityType,ComplexType').forEach(typeElement => {
        const entityTypeName = buildName({ schemaNamespace, name: typeElement.getAttribute('Name') });
        const isOpenType = typeElement.getAttribute('OpenType') === 'true';
        const isAbstract = typeElement.getAttribute('Abstract') === 'true';
        const extensions: EntityTypeExtensions = {
          entityInfo: {
            actualFields: [],
            navigationFields: [],
          },
          typeElement,
        };
        const inputType = schemaComposer.createInputTC({
          name: entityTypeName + 'Input',
          fields: {},
          extensions: () => extensions,
        });
        let abstractType: InterfaceTypeComposer;
        if (schemaElement.querySelector(`[BaseType*=".${entityTypeName}"]`) || isAbstract) {
          abstractType = schemaComposer.createInterfaceTC({
            name: isAbstract ? entityTypeName : `I${entityTypeName}`,
            extensions,
            resolveType: (root: any) => {
              const typeRef = root['@odata.type']?.replace('#', '');
              if (typeRef) {
                const typeName = getTypeNameFromRef({
                  typeRef: root['@odata.type'].replace('#', ''),
                  isInput: false,
                  isRequired: false,
                  schemaNamespace,
                });
                return typeName;
              }
              return isAbstract ? `T${entityTypeName}` : entityTypeName;
            },
          });
        }
        const outputType = schemaComposer.createObjectTC({
          name: isAbstract ? `T${entityTypeName}` : entityTypeName,
          extensions,
          interfaces: abstractType ? [abstractType] : [],
        });

        abstractType?.setInputTypeComposer(inputType);
        outputType.setInputTypeComposer(inputType);

        const propertyRefElement = typeElement.querySelector('PropertyRef');
        if (propertyRefElement) {
          extensions.entityInfo.identifierFieldName = propertyRefElement.getAttribute('Name');
        }

        typeElement.querySelectorAll('Property').forEach(propertyElement => {
          const propertyName = propertyElement.getAttribute('Name');
          extensions.entityInfo.actualFields.push(propertyName);
          const propertyTypeRef = propertyElement.getAttribute('Type');
          if (propertyName === extensions.entityInfo.identifierFieldName) {
            extensions.entityInfo.identifierFieldTypeRef = propertyTypeRef;
          }
          const isRequired = propertyElement.getAttribute('Nullable') === 'false';
          inputType.addFields({
            [propertyName]: {
              type: getTypeNameFromRef({
                typeRef: propertyTypeRef,
                isInput: true,
                isRequired,
                schemaNamespace,
              }),
              extensions: { propertyElement },
            },
          });
          const field: ObjectTypeComposerFieldConfigDefinition<any, unknown> = {
            type: getTypeNameFromRef({
              typeRef: propertyTypeRef,
              isInput: false,
              isRequired,
              schemaNamespace,
            }),
            extensions: { propertyElement },
          };
          abstractType?.addFields({
            [propertyName]: field,
          });
          outputType.addFields({
            [propertyName]: field,
          });
        });
        typeElement.querySelectorAll('NavigationProperty').forEach(navigationPropertyElement => {
          const navigationPropertyName = navigationPropertyElement.getAttribute('Name');
          extensions.entityInfo.navigationFields.push(navigationPropertyName);
          const navigationPropertyTypeRef = navigationPropertyElement.getAttribute('Type');
          const isRequired = navigationPropertyElement.getAttribute('Nullable') === 'false';
          const isList = navigationPropertyTypeRef.startsWith('Collection(');
          const field: ObjectTypeComposerFieldConfigDefinition<any, unknown> = {
            type: getTypeNameFromRef({
              typeRef: navigationPropertyTypeRef,
              isInput: false,
              isRequired,
              schemaNamespace,
            }),
            args: {
              ...commonArgs,
              ...(isList && { queryOptions: { type: 'QueryOptions' } }),
            },
            extensions: { navigationPropertyElement },
            resolve: async (root, args, context, info) => {
              if (navigationPropertyName in root) {
                return root[navigationPropertyName];
              }
              const url = new URL(root['@odata.id']);
              url.href = urljoin(url.href, '/' + navigationPropertyName);
              const parsedInfoFragment = parseResolveInfo(info) as ResolveTree;
              const searchParams = prepareSearchParams(parsedInfoFragment, info.schema);
              searchParams.forEach((value, key) => {
                url.searchParams.set(key, value);
              });
              const urlString = getUrlString(url);
              const method = 'GET';
              const request = new Request(urlString, {
                method,
                headers: headersFactory({ root, args, context, info }, method),
              });
              const response = await context[`${name}DataLoader`].load(request);
              const responseText = await response.text();
              return handleResponseText(responseText, urlString, info);
            },
          };
          abstractType?.addFields({
            [navigationPropertyName]: field,
          });
          outputType.addFields({
            [navigationPropertyName]: field,
          });
        });
        if (isOpenType || outputType.getFieldNames().length === 0) {
          inputType.addFields({
            rest: {
              type: 'JSON',
            },
          });
          abstractType?.addFields({
            rest: {
              type: 'JSON',
              resolve: (root: any) => root,
            },
          });
          outputType.addFields({
            rest: {
              type: 'JSON',
              resolve: (root: any) => root,
            },
          });
        }
        const updateInputType = inputType.clone(`${entityTypeName}UpdateInput`);
        updateInputType.getFieldNames().forEach(fieldName => updateInputType.makeOptional(fieldName));
        // Types might be considered as unused implementations of interfaces so we must prevent that
        schemaComposer.addSchemaMustHaveType(outputType);
      });

      schemaElement.querySelectorAll(`Function:not([IsBound="true"])`).forEach(unboundFunctionElement => {
        const functionName = unboundFunctionElement.getAttribute('Name');
        const returnTypeRef = unboundFunctionElement.querySelector('ReturnType').getAttribute('Type');
        const returnType = getTypeNameFromRef({
          typeRef: returnTypeRef,
          isInput: false,
          isRequired: false,
          schemaNamespace,
        });
        schemaComposer.Query.addFields({
          [functionName]: {
            type: returnType,
            args: {
              ...commonArgs,
            },
            resolve: async (root, args, context, info) => {
              const url = new URL(config.baseUrl);
              url.href = urljoin(url.href, '/' + functionName);
              url.href += `(${Object.entries(args)
                .filter(argEntry => argEntry[0] !== 'queryOptions')
                .map(argEntry => argEntry.join(' = '))
                .join(', ')})`;
              const parsedInfoFragment = parseResolveInfo(info) as ResolveTree;
              const searchParams = prepareSearchParams(parsedInfoFragment, info.schema);
              searchParams.forEach((value, key) => {
                url.searchParams.set(key, value);
              });
              const urlString = getUrlString(url);
              const method = 'GET';
              const request = new Request(urlString, {
                method,
                headers: headersFactory({ root, args, context, info }, method),
              });
              const response = await context[`${name}DataLoader`].load(request);
              const responseText = await response.text();
              return handleResponseText(responseText, urlString, info);
            },
          },
        });
        unboundFunctionElement.querySelectorAll('Parameter').forEach(parameterElement => {
          const parameterName = parameterElement.getAttribute('Name');
          const parameterTypeRef = parameterElement.getAttribute('Type');
          const isRequired = parameterElement.getAttribute('Nullable') === 'false';
          const parameterType = getTypeNameFromRef({
            typeRef: parameterTypeRef,
            isInput: true,
            isRequired,
            schemaNamespace,
          });
          schemaComposer.Query.addFieldArgs(functionName, {
            [parameterName]: {
              type: parameterType,
            },
          });
        });
      });

      schemaElement.querySelectorAll('Action:not([IsBound="true"])').forEach(unboundActionElement => {
        const actionName = unboundActionElement.getAttribute('Name');
        schemaComposer.Mutation.addFields({
          [actionName]: {
            type: 'JSON',
            args: {
              ...commonArgs,
            },
            resolve: async (root, args, context, info) => {
              const url = new URL(config.baseUrl);
              url.href = urljoin(url.href, '/' + actionName);
              const urlString = getUrlString(url);
              const method = 'POST';
              const request = new Request(urlString, {
                method,
                headers: headersFactory({ root, args, context, info }, method),
                body: JSON.stringify(args),
              });
              const response = await context[`${name}DataLoader`].load(request);
              const responseText = await response.text();
              return handleResponseText(responseText, urlString, info);
            },
          },
        });
        unboundActionElement.querySelectorAll('Parameter').forEach(parameterElement => {
          const parameterName = parameterElement.getAttribute('Name');
          const parameterTypeRef = parameterElement.getAttribute('Type');
          const isRequired = parameterElement.getAttribute('Nullable') === 'false';
          const parameterType = getTypeNameFromRef({
            typeRef: parameterTypeRef,
            isInput: true,
            isRequired,
            schemaNamespace,
          });
          schemaComposer.Mutation.addFieldArgs(actionName, {
            [parameterName]: {
              type: parameterType,
            },
          });
        });
      });

      schemaElement.querySelectorAll('Singleton').forEach(singletonElement => {
        const singletonName = singletonElement.getAttribute('Name');
        const singletonTypeRef = singletonElement.getAttribute('Type');
        const singletonTypeName = getTypeNameFromRef({
          typeRef: singletonTypeRef,
          isInput: false,
          isRequired: false,
          schemaNamespace,
        });
        schemaComposer.Query.addFields({
          [singletonName]: {
            type: singletonTypeName,
            args: {
              ...commonArgs,
            },
            resolve: async (root, args, context, info) => {
              const url = new URL(config.baseUrl);
              url.href = urljoin(url.href, '/' + singletonName);
              const parsedInfoFragment = parseResolveInfo(info) as ResolveTree;
              const searchParams = prepareSearchParams(parsedInfoFragment, info.schema);
              searchParams.forEach((value, key) => {
                url.searchParams.set(key, value);
              });
              const urlString = getUrlString(url);
              const method = 'GET';
              const request = new Request(urlString, {
                method,
                headers: headersFactory({ root, args, context, info }, method),
              });
              const response = await context[`${name}DataLoader`].load(request);
              const responseText = await response.text();
              return handleResponseText(responseText, urlString, info);
            },
          },
        });
      });

      schemaElement.querySelectorAll(`Function[IsBound="true"]`).forEach(boundFunctionElement => {
        const functionName = boundFunctionElement.getAttribute('Name');
        const functionRef = schemaNamespace + '.' + functionName;
        const returnTypeRef = boundFunctionElement.querySelector('ReturnType').getAttribute('Type');
        const returnType = getTypeNameFromRef({
          typeRef: returnTypeRef,
          isInput: false,
          isRequired: false,
          schemaNamespace,
        });
        const args: ObjectTypeComposerArgumentConfigMapDefinition<any> = {
          ...commonArgs,
        };
        let entitySetPath = boundFunctionElement.getAttribute('EntitySetPath');
        boundFunctionElement.querySelectorAll('Parameter').forEach(parameterElement => {
          const parameterName = parameterElement.getAttribute('Name');
          const parameterTypeRef = parameterElement.getAttribute('Type');
          const isRequired = parameterElement.getAttribute('Nullable') === 'false';
          const parameterTypeName = getTypeNameFromRef({
            typeRef: parameterTypeRef,
            isInput: true,
            isRequired,
            schemaNamespace,
          });
          // If entitySetPath is not available, take first parameter as entity
          entitySetPath = entitySetPath || parameterName;
          if (entitySetPath === parameterName) {
            const boundEntityTypeName = getTypeNameFromRef({
              typeRef: parameterTypeRef,
              isInput: false,
              isRequired: false,
              schemaNamespace,
            })
              .replace('[', '')
              .replace(']', '');
            const boundEntityType = schemaComposer.getAnyTC(boundEntityTypeName) as InterfaceTypeComposer;
            const boundEntityOtherType = getTCByTypeNames(
              'I' + boundEntityTypeName,
              'T' + boundEntityTypeName
            ) as InterfaceTypeComposer;
            const field: ObjectTypeComposerFieldConfigDefinition<any, any, any> = {
              type: returnType,
              args,
              resolve: async (root, args, context, info) => {
                const url = new URL(root['@odata.id']);
                url.href = urljoin(url.href, '/' + functionRef);
                const parsedInfoFragment = parseResolveInfo(info) as ResolveTree;
                const searchParams = prepareSearchParams(parsedInfoFragment, info.schema);
                searchParams.forEach((value, key) => {
                  url.searchParams.set(key, value);
                });
                const urlString = getUrlString(url);
                const method = 'GET';
                const request = new Request(urlString, {
                  method,
                  headers: headersFactory({ root, args, context, info }, method),
                });
                const response = await context[`${name}DataLoader`].load(request);
                const responseText = await response.text();
                return handleResponseText(responseText, urlString, info);
              },
            };
            boundEntityType.addFields({
              [functionName]: field,
            });
            boundEntityOtherType?.addFields({
              [functionName]: field,
            });
          }
          args[parameterName] = {
            type: parameterTypeName,
          };
        });
      });

      schemaElement.querySelectorAll(`Action[IsBound="true"]`).forEach(boundActionElement => {
        const actionName = boundActionElement.getAttribute('Name');
        const actionRef = schemaNamespace + '.' + actionName;
        const args: ObjectTypeComposerArgumentConfigMapDefinition<any> = {
          ...commonArgs,
        };
        let entitySetPath = boundActionElement.getAttribute('EntitySetPath');
        let boundField: ObjectTypeComposerFieldConfigDefinition<any, any, any>;
        let boundEntityTypeName: string;
        boundActionElement.querySelectorAll('Parameter').forEach(parameterElement => {
          const parameterName = parameterElement.getAttribute('Name');
          const parameterTypeRef = parameterElement.getAttribute('Type');
          const isRequired = parameterElement.getAttribute('Nullable') === 'false';
          const parameterTypeName = getTypeNameFromRef({
            typeRef: parameterTypeRef,
            isInput: true,
            isRequired,
            schemaNamespace,
          });
          // If entitySetPath is not available, take first parameter as entity
          entitySetPath = entitySetPath || parameterName;
          if (entitySetPath === parameterName) {
            boundEntityTypeName = getTypeNameFromRef({
              typeRef: parameterTypeRef,
              isInput: false,
              isRequired: false,
              schemaNamespace,
            })
              .replace('[', '')
              .replace(']', ''); // Todo temp workaround
            boundField = {
              type: 'JSON',
              args,
              resolve: async (root, args, context, info) => {
                const url = new URL(root['@odata.id']);
                url.href = urljoin(url.href, '/' + actionRef);
                const urlString = getUrlString(url);
                const method = 'POST';
                const request = new Request(urlString, {
                  method,
                  headers: headersFactory({ root, args, context, info }, method),
                  body: JSON.stringify(args),
                });
                const response = await context[`${name}DataLoader`].load(request);
                const responseText = await response.text();
                return handleResponseText(responseText, urlString, info);
              },
            };
          }
          args[parameterName] = {
            type: parameterTypeName,
          };
        });
        const boundEntityType = schemaComposer.getAnyTC(boundEntityTypeName) as InterfaceTypeComposer;
        boundEntityType.addFields({
          [actionName]: boundField,
        });
        const otherType = getTCByTypeNames(
          `I${boundEntityTypeName}`,
          `T${boundEntityTypeName}`
        ) as InterfaceTypeComposer;
        otherType?.addFields({
          [actionName]: boundField,
        });
      });

      // Rearrange fields for base types and implementations

      schemaElement.querySelectorAll('[BaseType]').forEach(typeElement => {
        const typeName = buildName({
          schemaNamespace,
          name: typeElement.getAttribute('Name'),
        });
        const inputType = schemaComposer.getITC(typeName + 'Input') as InputTypeComposer;
        const abstractType = getTCByTypeNames('I' + typeName, typeName) as InterfaceTypeComposer;
        const outputType = getTCByTypeNames('T' + typeName, typeName) as ObjectTypeComposer;
        const baseTypeRef = typeElement.getAttribute('BaseType');
        const { entityInfo } = outputType.getExtensions() as EntityTypeExtensions;
        const baseTypeName = getTypeNameFromRef({
          typeRef: baseTypeRef,
          isInput: false,
          isRequired: false,
          schemaNamespace,
        });
        const baseInputType = schemaComposer.getAnyTC(baseTypeName + 'Input') as InputTypeComposer;
        const baseAbstractType = getTCByTypeNames('I' + baseTypeName, baseTypeName) as InterfaceTypeComposer;
        const baseOutputType = getTCByTypeNames('T' + baseTypeName, baseTypeName) as ObjectTypeComposer;
        inputType.addFields(baseInputType.getFields());
        const { entityInfo: baseEntityInfo } = baseOutputType.getExtensions() as EntityTypeExtensions;
        entityInfo.identifierFieldName = baseEntityInfo.identifierFieldName;
        entityInfo.identifierFieldTypeRef = baseEntityInfo.identifierFieldTypeRef;
        entityInfo.actualFields.unshift(...baseEntityInfo.actualFields);
        abstractType?.addFields(baseAbstractType?.getFields());
        outputType.addFields(baseOutputType.getFields());
        if (baseAbstractType instanceof InterfaceTypeComposer) {
          outputType.addInterface(baseAbstractType.getTypeName());
        }
      });

      schemaElement.querySelectorAll('EntitySet').forEach(entitySetElement => {
        const entitySetName = entitySetElement.getAttribute('Name');
        const entitySetTypeRef = entitySetElement.getAttribute('EntityType');
        const entityTypeName = getTypeNameFromRef({
          typeRef: entitySetTypeRef,
          isInput: false,
          isRequired: false,
          schemaNamespace,
        });
        const entityOutputTC = getTCByTypeNames('I' + entityTypeName, entityTypeName) as
          | InterfaceTypeComposer
          | ObjectTypeComposer;
        const { entityInfo } = entityOutputTC.getExtensions() as EntityTypeExtensions;
        const identifierFieldName = entityInfo.identifierFieldName;
        const identifierFieldTypeRef = entityInfo.identifierFieldTypeRef;
        const identifierFieldTypeName = entityOutputTC.getFieldTypeName(identifierFieldName);
        const typeName = entityOutputTC.getTypeName();
        const commonFields: Record<string, ObjectTypeComposerFieldConfigDefinition<any, any>> = {
          [entitySetName]: {
            type: `[${typeName}]`,
            args: {
              ...commonArgs,
              queryOptions: { type: 'QueryOptions' },
            },
            resolve: async (root, args, context, info) => {
              const url = new URL(config.baseUrl);
              url.href = urljoin(url.href, '/' + entitySetName);
              const parsedInfoFragment = parseResolveInfo(info) as ResolveTree;
              const searchParams = prepareSearchParams(parsedInfoFragment, info.schema);
              searchParams.forEach((value, key) => {
                url.searchParams.set(key, value);
              });
              const urlString = getUrlString(url);
              const method = 'GET';
              const request = new Request(urlString, {
                method,
                headers: headersFactory({ root, args, context, info }, method),
              });
              const response = await context[`${name}DataLoader`].load(request);
              const responseText = await response.text();
              return handleResponseText(responseText, urlString, info);
            },
          },
          [`${entitySetName}By${identifierFieldName}`]: {
            type: typeName,
            args: {
              ...commonArgs,
              [identifierFieldName]: {
                type: identifierFieldTypeName,
              },
            },
            resolve: async (root, args, context, info) => {
              const url = new URL(config.baseUrl);
              url.href = urljoin(url.href, '/' + entitySetName);
              addIdentifierToUrl(url, identifierFieldName, identifierFieldTypeRef, args);
              const parsedInfoFragment = parseResolveInfo(info) as ResolveTree;
              const searchParams = prepareSearchParams(parsedInfoFragment, info.schema);
              searchParams.forEach((value, key) => {
                url.searchParams.set(key, value);
              });
              const urlString = getUrlString(url);
              const method = 'GET';
              const request = new Request(urlString, {
                method,
                headers: headersFactory({ root, args, context, info }, method),
              });
              const response = await context[`${name}DataLoader`].load(request);
              const responseText = await response.text();
              return handleResponseText(responseText, urlString, info);
            },
          },
        };
        schemaComposer.Query.addFields({
          ...commonFields,
          [`${entitySetName}Count`]: {
            type: 'Int',
            args: {
              ...commonArgs,
              queryOptions: { type: 'QueryOptions' },
            },
            resolve: async (root, args, context, info) => {
              const url = new URL(config.baseUrl);
              url.href = urljoin(url.href, `/${entitySetName}/$count`);
              const urlString = getUrlString(url);
              const method = 'GET';
              const request = new Request(urlString, {
                method,
                headers: headersFactory({ root, args, context, info }, method),
              });
              const response = await context[`${name}DataLoader`].load(request);
              const responseText = await response.text();
              return responseText;
            },
          },
        });
        schemaComposer.Mutation.addFields({
          ...commonFields,
          [`create${entitySetName}`]: {
            type: typeName,
            args: {
              ...commonArgs,
              input: {
                type: entityTypeName + 'Input',
              },
            },
            resolve: async (root, args, context, info) => {
              const url = new URL(config.baseUrl);
              url.href = urljoin(url.href, '/' + entitySetName);
              const urlString = getUrlString(url);
              rebuildOpenInputObjects(args.input);
              const method = 'POST';
              const request = new Request(urlString, {
                method,
                headers: headersFactory({ root, args, context, info }, method),
                body: JSON.stringify(args.input),
              });
              const response = await context[`${name}DataLoader`].load(request);
              const responseText = await response.text();
              return handleResponseText(responseText, urlString, info);
            },
          },
          [`delete${entitySetName}By${identifierFieldName}`]: {
            type: 'JSON',
            args: {
              ...commonArgs,
              [identifierFieldName]: {
                type: identifierFieldTypeName,
              },
            },
            resolve: async (root, args, context, info) => {
              const url = new URL(config.baseUrl);
              url.href = urljoin(url.href, '/' + entitySetName);
              addIdentifierToUrl(url, identifierFieldName, identifierFieldTypeRef, args);
              const urlString = getUrlString(url);
              const method = 'DELETE';
              const request = new Request(urlString, {
                method,
                headers: headersFactory({ root, args, context, info }, method),
              });
              const response = await context[`${name}DataLoader`].load(request);
              const responseText = await response.text();
              return handleResponseText(responseText, urlString, info);
            },
          },
          [`update${entitySetName}By${identifierFieldName}`]: {
            type: typeName,
            args: {
              ...commonArgs,
              [identifierFieldName]: {
                type: identifierFieldTypeName,
              },
              input: {
                type: entityTypeName + 'UpdateInput',
              },
            },
            resolve: async (root, args, context, info) => {
              const url = new URL(config.baseUrl);
              url.href = urljoin(url.href, '/' + entitySetName);
              addIdentifierToUrl(url, identifierFieldName, identifierFieldTypeRef, args);
              const urlString = getUrlString(url);
              rebuildOpenInputObjects(args.input);
              const method = 'PATCH';
              const request = new Request(urlString, {
                method,
                headers: headersFactory({ root, args, context, info }, method),
                body: JSON.stringify(args.input),
              });
              const response = await context[`${name}DataLoader`].load(request);
              const responseText = await response.text();
              return handleResponseText(responseText, urlString, info);
            },
          },
        });
      });
    });

    const schema = schemaComposer.buildSchema();

    return {
      schema,
      contextVariables,
      contextBuilder: async context => ({
        [`${name}DataLoader`]: dataLoaderFactory(context),
      }),
    };
  },
};

export default handler;
