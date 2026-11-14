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

/** Microsoft Graph JSON batch limit; safe default for other OData JSON `$batch` endpoints. */
const JSON_BATCH_MAX_REQUESTS = 20;

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
        signal: request.signal,
      },
      context,
    ) as Promise<Response>;

  const authHeadersFromRequests = (requests: readonly Request[]): Record<string, string> => {
    const headers: Record<string, string> = {};
    const first = requests[0];
    if (!first) return headers;
    first.headers?.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === 'authorization' || lower === 'cookie' || lower === 'api-key') {
        headers[key] = value;
      }
    });
    return headers;
  };

  const batchSignal = (requests: readonly Request[]): AbortSignal | undefined => {
    const signals = requests.map(r => r.signal).filter((s): s is AbortSignal => s != null);
    if (!signals.length) return undefined;
    if (signals.length === 1) return signals[0];
    const any = (AbortSignal as any).any;
    if (typeof any === 'function') {
      return any(signals);
    }
    return signals[0];
  };

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
          requestBody += `Content-Length: ${bodyAsStr.length}\n`;
          // Empty line terminates embedded HTTP headers before the body (RFC 9112).
          requestBody += `\n`;
          requestBody += bodyAsStr;
        }
        requestBody += `\n`;
      }
      requestBody += `--${requestBoundary}--\n`;
      const batchHeaders: Record<string, string> = {
        'content-type': `multipart/mixed;boundary=${requestBoundary}`,
        ...authHeadersFromRequests(requests),
      };
      const batchResponse = await fetchFn(
        urljoin(endpointNormalized, '$batch'),
        {
          method: 'POST',
          body: requestBody,
          headers: batchHeaders,
          signal: batchSignal(requests),
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
        // MIME part headers end at the first blank line; keep the embedded HTTP response intact.
        const normalized = responseTextWithContentHeader.replace(/^\r?\n/, '');
        const headerEnd = normalized.search(/\r?\n\r?\n/);
        const responseText =
          headerEnd === -1 ? normalized : normalized.slice(headerEnd).replace(/^\r?\n\r?\n/, '');
        const { body, headers, statusCode, statusMessage } = parseResponse(responseText);
        return new Response(body, {
          headers,
          status: parseInt(statusCode, 10),
          statusText: statusMessage,
        });
      });
    });

  async function sendJsonBatch(requests: readonly Request[], context: any): Promise<Response[]> {
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
        headers: {
          'content-type': 'application/json',
          ...authHeadersFromRequests(requests),
        },
        signal: batchSignal(requests),
      },
      context,
    );
    const batchResponseJson = await batchResponse.json();
    return handleBatchJsonResults(batchResponseJson, requests);
  }

  const jsonFactory = (context: any) =>
    new DataLoader<Request, Response>(async requests => {
      // Skip /$batch for a lone request — cheaper and keeps simple mocks working.
      if (requests.length === 1) {
        return [await forwardSingle(requests[0], context)];
      }
      // Microsoft Graph caps JSON batch at 20 requests — split larger queues.
      if (requests.length > JSON_BATCH_MAX_REQUESTS) {
        const results: Response[] = [];
        for (let i = 0; i < requests.length; i += JSON_BATCH_MAX_REQUESTS) {
          const chunk = requests.slice(i, i + JSON_BATCH_MAX_REQUESTS);
          results.push(...(await sendJsonBatch(chunk, context)));
        }
        return results;
      }
      return sendJsonBatch(requests, context);
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
