import { isListType, GraphQLObjectType, GraphQLResolveInfo } from "graphql";
import DataLoader from 'dataloader';
import { parseResponse } from 'http-string-parser';
import { getCachedFetch, jsonFlatStringify } from "@graphql-mesh/utils";
import { Request, Response } from 'cross-fetch';
import { nativeFetch } from './native-fetch';
import { EntityTypeExtensions } from "./schema-util";
import { getUrlString, addIdentifierToUrl } from "./util";
import urljoin from 'url-join';
import { ResolverData } from "@graphql-mesh/types";

type HeadersFactory = (resolverData: ResolverData, method: string) => Headers;
type DataLoaderFactory = (context: any) => DataLoader<Request, Response, Request>;
type DataLoaderType = 'multipart' | 'json' | 'none';

export function getDataLoaderFactory(type: DataLoaderType, baseUrl: string, env: Record<string, string>, headersFactory: HeadersFactory, fetch: ReturnType<typeof getCachedFetch>): DataLoaderFactory {
  const factories = initDataloaderFactories(baseUrl, env, headersFactory, fetch);
  return factories[type];
}

function initDataloaderFactories(baseUrl: string, env: Record<string, string>, headersFactory: HeadersFactory, fetch: ReturnType<typeof getCachedFetch>) {
  return {
    multipart: (context: any) =>
      new DataLoader(async (requests: Request[]): Promise<Response[]> => {
        let requestBody = '';
        const requestBoundary = 'batch_' + Date.now();
        for (const requestIndex in requests) {
          requestBody += `--${requestBoundary}\n`;
          const request = requests[requestIndex];
          requestBody += `Content-Type: application/http\n`;
          requestBody += `Content-Transfer-Encoding:binary\n`;
          requestBody += `Content-ID: ${requestIndex}\n\n`;
          requestBody += `${request.method} ${request.url} HTTP/1.1\n`;
          request.headers?.forEach((value, key) => {
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
        const batchHeaders = headersFactory({ context, env }, 'POST');
        batchHeaders.set('Content-Type', `multipart/mixed;boundary=${requestBoundary}`);
        const batchRequest = new Request(urljoin(baseUrl, '$batch'), {
          method: 'POST',
          body: requestBody,
          headers: batchHeaders,
        });
        const batchResponse = await nativeFetch(batchRequest);
        const batchResponseText = await batchResponse.text();
        if (!batchResponseText.startsWith('--')) {
          const batchResponseJson = JSON.parse(batchResponseText);
          return handleBatchJsonResults(batchResponseJson, requests);
        }
        const responseLines = batchResponseText.split('\n');
        const responseBoundary = responseLines[0];
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
      }),
    json: (context: any) =>
      new DataLoader(async (requests: Request[]): Promise<Response[]> => {
        const batchHeaders = headersFactory({ context, env }, 'POST');
        batchHeaders.set('Content-Type', 'application/json');
        const batchRequest = new Request(urljoin(baseUrl, '$batch'), {
          method: 'POST',
          body: jsonFlatStringify({
            requests: await Promise.all(
              requests.map(async (request, index) => {
                const id = index.toString();
                const url = request.url.replace(baseUrl, '');
                const method = request.method;
                const headers: HeadersInit = {};
                request.headers?.forEach((value, key) => {
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
        const batchResponse = await fetch(batchRequest);
        const batchResponseText = await batchResponse.text();
        const batchResponseJson = JSON.parse(batchResponseText);
        return handleBatchJsonResults(batchResponseJson, requests);
      }),
    none: () =>
      new DataLoader(
        (requests: Request[]): Promise<Response[]> => Promise.all(requests.map(request => fetch(request)))
      ),
  };
};

export function handleBatchJsonResults(batchResponseJson: any, requests: Request[]) {
  if ('error' in batchResponseJson) {
    const error = new Error(batchResponseJson.error.message);
    Object.assign(error, {
      extensions: batchResponseJson.error,
    });
    throw error;
  }
  if (!('responses' in batchResponseJson)) {
    const error = new Error(`Batch Request didn't return a valid response.`);
    Object.assign(error, {
      extensions: batchResponseJson,
    });
    throw error;
  }
  return requests.map((_req, index) => {
    const responseObj = batchResponseJson.responses.find((res: any) => res.id === index.toString());
    return new Response(jsonFlatStringify(responseObj.body), {
      status: responseObj.status,
      headers: responseObj.headers,
    });
  });
}

export function handleResponseText(responseText: string, urlString: string, info: GraphQLResolveInfo) {
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
      const urlOfElement = new URL(urlStringWithoutSearchParams);
      addIdentifierToUrl(
        urlOfElement,
        entityTypeExtensions.entityInfo.identifierFieldName,
        entityTypeExtensions.entityInfo.identifierFieldTypeRef,
        element
      );
      const identifierUrl = element['@odata.id'] || getUrlString(urlOfElement);
      return buildResponseObject(element, actualReturnType, identifierUrl);
    });
  } else {
    const actualReturnType = info.returnType as GraphQLObjectType;
    const identifierUrl = responseJson['@odata.id'] || urlStringWithoutSearchParams;

    return buildResponseObject(responseJson, actualReturnType, identifierUrl);
  }
}

function buildResponseObject(originalObject: any, actualReturnType: GraphQLObjectType, identifierUrl: any) {
  const entityTypeExtensions = actualReturnType.extensions as EntityTypeExtensions;
  if (!entityTypeExtensions?.entityInfo) {
    return originalObject;
  }

  const fieldMap = actualReturnType.getFields();
  for (const fieldName in originalObject) {
    if (entityTypeExtensions?.entityInfo.navigationFields.includes(fieldName)) {
      const field = originalObject[fieldName];
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
          fieldElement['@odata.id'] = field['@odata.id'] || getUrlString(urlOfField);
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
    ...originalObject,
  };
}
