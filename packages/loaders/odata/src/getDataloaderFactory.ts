import DataLoader from 'dataloader';
import { parseResponse } from 'http-string-parser';
import urljoin from 'url-join';
import type { MeshFetch } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';
import { createGraphQLError, memoize1 } from '@graphql-tools/utils';
import { Response } from '@whatwg-node/fetch';

export type DataloaderFactory = (context: any) => DataLoader<Request, Response>;

interface DataloaderFactoryOpts {
  fetchFn: MeshFetch;
  endpoint: string;
  headersFactory: (resolverData: any, method: string) => Record<string, string>;
  batchMode: 'none' | 'json' | 'multipart';
}

export function getDataloaderFactory({
  fetchFn,
  endpoint,
  headersFactory,
  batchMode,
}: DataloaderFactoryOpts): DataloaderFactory {
  const DATALOADER_FACTORIES = {
    multipart: (context: any) =>
      new DataLoader<Request, Response>(async requests => {
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
        const batchHeaders = headersFactory(
          {
            context,
            env: process.env,
          },
          'POST',
        );
        batchHeaders['content-type'] = `multipart/mixed;boundary=${requestBoundary}`;
        const batchResponse = await fetchFn(urljoin(endpoint, '$batch'), {
          method: 'POST',
          body: requestBody,
          headers: batchHeaders,
        });
        if (batchResponse.headers.get('content-type').includes('json')) {
          const batchResponseJson = await batchResponse.json();
          return handleBatchJsonResults(batchResponseJson, requests);
        }
        const batchResponseText = await batchResponse.text();
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
      new DataLoader<Request, Response>(async requests => {
        const batchHeaders = headersFactory(
          {
            context,
            env: process.env,
          },
          'POST',
        );
        batchHeaders['content-type'] = 'application/json';
        const batchResponse = await fetchFn(urljoin(endpoint, '$batch'), {
          method: 'POST',
          body: JSON.stringify({
            requests: await Promise.all(
              requests.map(async (request, index) => {
                const id = index.toString();
                const url = request.url.replace(endpoint, '');
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
              }),
            ),
          }),
          headers: batchHeaders,
        });
        const batchResponseJson = await batchResponse.json();
        return handleBatchJsonResults(batchResponseJson, requests);
      }),
    none: () =>
      // We should refactor here
      new DataLoader<Request, Response>(requests =>
        Promise.all(
          requests.map(async request =>
            fetchFn(request.url, {
              method: request.method,
              body: request.body && (await request.text()),
              headers: getHeadersObj(request.headers),
            }),
          ),
        ),
      ),
  };

  return memoize1(DATALOADER_FACTORIES[batchMode]);
}

function handleBatchJsonResults(batchResponseJson: any, requests: readonly Request[]) {
  if ('error' in batchResponseJson) {
    throw createGraphQLError(batchResponseJson.error.message, {
      extensions: batchResponseJson.error,
    });
  }
  if (!('responses' in batchResponseJson)) {
    throw createGraphQLError(
      batchResponseJson.ExceptionMessage ||
        batchResponseJson.Message ||
        `Batch Request didn't return a valid response.`,
      {
        extensions: batchResponseJson,
      },
    );
  }
  return requests.map((_req, index) => {
    const responseObj = batchResponseJson.responses.find((res: any) => res.id === index.toString());
    return Response.json(responseObj.body, {
      status: responseObj.status,
      headers: responseObj.headers,
    });
  });
}
