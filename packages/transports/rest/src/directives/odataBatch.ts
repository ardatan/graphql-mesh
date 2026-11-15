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
/** Default + configurable names that must not cross tenants on outer `/$batch`. */
export function isODataBatchSecurityHeader(
  key: string,
  extraSecurityHeaderNames?: readonly string[],
): boolean {
  const lower = key.toLowerCase();
  if (extraSecurityHeaderNames?.some(n => n.toLowerCase() === lower)) {
    return true;
  }
  if (
    lower === 'authorization' ||
    lower === 'proxy-authorization' ||
    lower === 'cookie' ||
    lower === 'cookie2' ||
    lower === 'api-key' ||
    lower === 'x-api-key' ||
    lower === 'x-auth-token' ||
    lower === 'ocp-apim-subscription-key' ||
    lower === 'ocp-apim-trace'
  ) {
    return true;
  }
  // Gateway / SaaS custom auth headers (subscription keys, tokens, secrets).
  return /(?:^|-)(auth|api-?key|subscription-?key|access-?token|secret|credential)(?:-|$)/i.test(
    lower,
  );
}

export function createODataBatchFetch(opts: {
  fetchFn: MeshFetch;
  endpoint: string;
  batchMode: ODataBatchMode;
  /** Extra header names treated like credentials for batch partitioning / outer forward. */
  securityHeaderNames?: readonly string[];
}): BatchableFetch {
  const { fetchFn, endpoint, batchMode, securityHeaderNames } = opts;
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

  const isSecuritySensitiveHeader = (key: string): boolean =>
    isODataBatchSecurityHeader(key, securityHeaderNames);

  const authHeadersFromRequest = (request: Request): Record<string, string> => {
    const headers: Record<string, string> = {};
    request.headers?.forEach((value, key) => {
      if (isSecuritySensitiveHeader(key)) {
        headers[key] = value;
      }
    });
    return headers;
  };

  /** Stable fingerprint so requests with different credentials never share one batch. */
  const securityHeaderFingerprint = (request: Request): string => {
    const pairs: string[] = [];
    request.headers?.forEach((value, key) => {
      if (isSecuritySensitiveHeader(key)) {
        pairs.push(`${key.toLowerCase()}=${value}`);
      }
    });
    pairs.sort();
    return pairs.join('\n');
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

  /**
   * DataLoader keys only by GraphQL context, so partition by security headers before
   * POSTing `/$batch`. Outer batch auth comes from that partition's requests only.
   */
  async function mapBySecurityGroup(
    requests: readonly Request[],
    runGroup: (group: readonly Request[]) => Promise<Response[]>,
  ): Promise<Response[]> {
    if (requests.length <= 1) {
      return runGroup(requests);
    }
    const groups = new Map<string, { indices: number[]; reqs: Request[] }>();
    for (let i = 0; i < requests.length; i++) {
      const key = securityHeaderFingerprint(requests[i]);
      let group = groups.get(key);
      if (!group) {
        group = { indices: [], reqs: [] };
        groups.set(key, group);
      }
      group.indices.push(i);
      group.reqs.push(requests[i]);
    }
    if (groups.size === 1) {
      return runGroup(requests);
    }
    const results: Response[] = new Array(requests.length);
    for (const group of groups.values()) {
      const groupResults = await runGroup(group.reqs);
      for (let j = 0; j < group.indices.length; j++) {
        results[group.indices[j]] = groupResults[j];
      }
    }
    return results;
  }

  async function sendMultipartBatch(
    requests: readonly Request[],
    context: any,
  ): Promise<Response[]> {
    // Skip /$batch for a lone request - cheaper and keeps simple mocks working.
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
      ...authHeadersFromRequest(requests[0]),
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
  }

  async function sendJsonBatch(requests: readonly Request[], context: any): Promise<Response[]> {
    // Skip /$batch for a lone request - cheaper and keeps simple mocks working.
    if (requests.length === 1) {
      return [await forwardSingle(requests[0], context)];
    }
    // Microsoft Graph caps JSON batch at 20 requests - split larger queues.
    if (requests.length > JSON_BATCH_MAX_REQUESTS) {
      const results: Response[] = [];
      for (let i = 0; i < requests.length; i += JSON_BATCH_MAX_REQUESTS) {
        const chunk = requests.slice(i, i + JSON_BATCH_MAX_REQUESTS);
        results.push(...(await sendJsonBatch(chunk, context)));
      }
      return results;
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
        headers: {
          'content-type': 'application/json',
          ...authHeadersFromRequest(requests[0]),
        },
        signal: batchSignal(requests),
      },
      context,
    );
    const batchResponseJson = await batchResponse.json();
    return handleBatchJsonResults(batchResponseJson, requests);
  }

  const multipartFactory = (context: any) =>
    new DataLoader<Request, Response>(async requests =>
      mapBySecurityGroup(requests, group => sendMultipartBatch(group, context)),
    );

  const jsonFactory = (context: any) =>
    new DataLoader<Request, Response>(async requests =>
      mapBySecurityGroup(requests, group => sendJsonBatch(group, context)),
    );

  const factory = batchMode === 'multipart' ? multipartFactory : jsonFactory;
  const getLoader = memoize1(factory);
  // Stable fallback - `context ?? {}` would allocate a new object per call and
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
