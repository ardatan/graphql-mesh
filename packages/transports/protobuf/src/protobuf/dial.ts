import type { GraphQLResolveInfo } from 'graphql';
import type { MeshFetch } from '@graphql-mesh/types';
import { fetch as defaultFetch } from '@whatwg-node/fetch';

export function isHttpLocation(location: string): boolean {
  return /^https?:\/\//i.test(location);
}

export function buildRpcPath(service: string | undefined, method: string): string {
  const svc = service?.replace(/^\//, '') || '';
  if (!svc) return `/${method}`;
  return `/${svc}/${method}`;
}

export function resolveHttpUrl(
  location: string,
  service: string | undefined,
  method: string,
): string {
  const rpcPath = buildRpcPath(service, method);
  // Append to pathname so query strings stay on the URL (not after the RPC path).
  try {
    const url = new URL(location);
    const basePath = url.pathname.replace(/\/$/, '');
    url.pathname = `${basePath}${rpcPath}`;
    return url.toString();
  } catch {
    const base = location.replace(/\/$/, '');
    return `${base}${rpcPath}`;
  }
}

/** Default Connect unary binary content type; override via `@transport(headers:)` (e.g. Twirp `application/protobuf`). */
export const DEFAULT_PROTOBUF_HTTP_CONTENT_TYPE = 'application/proto';

export async function httpProtobufUnary(opts: {
  url: string;
  body: Uint8Array;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  fetchFn?: MeshFetch;
  context?: any;
  info?: GraphQLResolveInfo;
}): Promise<Uint8Array> {
  const fetchFn = opts.fetchFn || defaultFetch;
  const res = await fetchFn(
    opts.url,
    {
      method: 'POST',
      headers: {
        'content-type': DEFAULT_PROTOBUF_HTTP_CONTENT_TYPE,
        ...opts.headers,
      },
      body: opts.body as any,
      signal: opts.signal,
    },
    opts.context,
    opts.info as any,
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Protobuf HTTP ${res.status}: ${text || res.statusText}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}
