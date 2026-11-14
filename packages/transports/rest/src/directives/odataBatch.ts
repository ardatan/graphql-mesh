import DataLoader from 'dataloader';
import { GraphQLError } from 'graphql';
import { parseResponse } from 'http-string-parser';
import urljoin from 'url-join';
import type { MeshFetch } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';
import { memoize1 } from '@graphql-tools/utils';
import { Response } from '@whatwg-node/fetch';

export type ODataBatchMode = 'none' | 'json' | 'multipart';

type BatchableFetch = (url: string, init?: RequestInit, context?: any) => Promise<Response>;

/**
 * Per-GraphQL-context DataLoader that coalesces Connectors HTTP calls into a single
 * OData `POST /$batch` (json or multipart). Mirrors the legacy `@omnigraph/odata`
 * `getDataloaderFactory` behavior for the transport-rest Connectors path.
 */
export function createODataBatchFetch(opts: {
  fetchFn: MeshFetch;
  endpoint: string;
  batchMode: ODataBatchMode;
}): BatchableFetch {
  const { fetchFn, endpoint, batchMode } = opts;
  if (!batchMode || batchMode === 'none' || !endpoint) {
    return (url, init, context) => fetchFn(url, init as any, context) as Promise<Response>;
  }

  const endpointNormalized = endpoint.replace(/\/+$/, '');

  const forwardSingle = async (request: Request, context: any) =>
    fetchFn(
      request.url,
      {
        method: request.method,
        body: request.body ? await request.text() : undefined,
        headers: getHeadersObj(request.headers),
      },
      context,
    ) as Promise<Response>;

  const multipartFactory = (context: any) =>
    new DataLoader<Request, Response>(async requests => {
      // Skip /$batch for a lone request — cheaper and keeps simple mocks working.
      if (requests.length === 1) {
        return [await forwardSingle(requests[0], context)];
      }
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
      const batchHeaders: Record<string, string> = {
        'content-type': `multipart/mixed;boundary=${requestBoundary}`,
      };
      const batchResponse = await fetchFn(
        urljoin(endpointNormalized, '$batch'),
        {
          method: 'POST',
          body: requestBody,
          headers: batchHeaders,
        },
        context,
      );
      const contentType = batchResponse.headers.get('content-type') || '';
      if (contentType.includes('json')) {
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
          status: parseInt(statusCode, 10),
          statusText: statusMessage,
        });
      });
    });

  const jsonFactory = (context: any) =>
    new DataLoader<Request, Response>(async requests => {
      // Skip /$batch for a lone request — cheaper and keeps simple mocks working.
      if (requests.length === 1) {
        return [await forwardSingle(requests[0], context)];
      }
      const batchResponse = await fetchFn(
        urljoin(endpointNormalized, '$batch'),
        {
          method: 'POST',
          body: JSON.stringify({
            requests: await Promise.all(
              requests.map(async (request, index) => {
                const id = index.toString();
                const url = request.url.startsWith(endpointNormalized)
                  ? request.url.slice(endpointNormalized.length) || '/'
                  : request.url.replace(endpoint, '');
                const method = request.method;
                const headers: Record<string, string> = {};
                request.headers?.forEach((value, key) => {
                  headers[key] = value;
                });
                let body: unknown;
                if (request.body) {
                  try {
                    body = await request.json();
                  } catch {
                    body = await request.text();
                  }
                }
                return { id, url, method, body, headers };
              }),
            ),
          }),
          headers: { 'content-type': 'application/json' },
        },
        context,
      );
      const batchResponseJson = await batchResponse.json();
      return handleBatchJsonResults(batchResponseJson, requests);
    });

  const factory = batchMode === 'multipart' ? multipartFactory : jsonFactory;
  const getLoader = memoize1(factory);
  // Stable fallback — `context ?? {}` would allocate a new object per call and
  // defeat DataLoader coalescing across sibling @connect resolvers.
  const noContextKey = Object.freeze({});

  return async (url, init, context) => {
    const request = new Request(url, init);
    return getLoader(context ?? noContextKey).load(request);
  };
}

function handleBatchJsonResults(batchResponseJson: any, requests: readonly Request[]) {
  if (batchResponseJson && typeof batchResponseJson === 'object' && 'error' in batchResponseJson) {
    throw new GraphQLError(batchResponseJson.error.message, {
      extensions: batchResponseJson.error,
    });
  }
  if (!batchResponseJson || !('responses' in batchResponseJson)) {
    throw new GraphQLError(
      batchResponseJson?.ExceptionMessage ||
        batchResponseJson?.Message ||
        `Batch Request didn't return a valid response.`,
      {
        extensions: batchResponseJson,
      },
    );
  }
  return requests.map((_req, index) => {
    const responseObj = batchResponseJson.responses.find((res: any) => res.id === index.toString());
    return Response.json(responseObj?.body ?? null, {
      status: responseObj?.status ?? 500,
      headers: responseObj?.headers,
    });
  });
}
