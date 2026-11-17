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
  const base = location.replace(/\/$/, '');
  return `${base}${buildRpcPath(service, method)}`;
}

export async function httpProtobufUnary(opts: {
  url: string;
  body: Uint8Array;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}): Promise<Uint8Array> {
  const res = await fetch(opts.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/proto',
      ...opts.headers,
    },
    body: opts.body as any,
    signal: opts.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Protobuf HTTP ${res.status}: ${text || res.statusText}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}
