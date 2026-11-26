import type { ExecutionResult } from 'graphql';
import { meros } from 'meros/browser';
import { createTenv } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';

/**
 * E2E for `@defer` through mesh transforms (prefix + hoist + rename) with
 * `deferStream: { subgraph: true }`.
 *
 * Port of Hive Gateway `e2e/defer-transforms`.
 */
const { compose, serve, service } = createTenv(__dirname);

async function startGateway() {
  const catalog = await service('catalog');
  const { output } = await compose({
    output: 'graphql',
    services: [catalog],
  });
  const gw = await serve({ supergraph: output });
  return { gw, catalog };
}

async function collectMultipart(hostname: string, port: number, query: string) {
  const t0 = Date.now();
  const res = await fetch(`http://${hostname}:${port}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'multipart/mixed;deferSpec=20220824',
    },
    body: JSON.stringify({ query }),
  });

  expect(res.ok).toBe(true);
  expect(res.headers.get('content-type')).toContain('multipart/mixed');

  const parts = await meros<ExecutionResult>(res);
  if (!('next' in parts)) {
    throw new Error('Expected an async iterable of multipart parts');
  }

  const payloads: Array<ExecutionResult & { hasNext?: boolean }> = [];
  const timings: number[] = [];
  for await (const part of parts) {
    if (!part.json) continue;
    timings.push(Date.now() - t0);
    payloads.push(part.body as ExecutionResult & { hasNext?: boolean });
  }
  return { payloads, timings };
}

it('forwards @defer through hoist/rename transforms and flushes before the slow field', async () => {
  const { gw, catalog } = await startGateway();
  const { hostname, port } = gw;

  await fetch(`http://${hostname}:${port}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: /* GraphQL */ `
        {
          product(id: "1") {
            id
            title
          }
        }
      `,
    }),
  });

  const { payloads, timings } = await collectMultipart(
    hostname,
    port,
    /* GraphQL */ `
      query ShopProduct {
        product(id: "1") {
          id
          title
          details {
            summary
          }
          ... @defer(if: true, label: "blurb") {
            productBlurb
          }
        }
      }
    `,
  );

  expect(payloads.length).toBeGreaterThan(1);
  expect(payloads[0]).toMatchObject({
    data: {
      product: {
        id: '1',
        title: 'Widget',
        details: { summary: 'In stock' },
      },
    },
    hasNext: true,
  });
  expect(
    (payloads[0]?.data as { product?: { productBlurb?: string } })?.product?.productBlurb,
  ).toBeUndefined();

  const recorded = await fetch(`http://${catalog.hostname}:${catalog.port}/_queries`).then(
    r => r.json() as Promise<{ queries: string[]; blurbResolverCalls: number }>,
  );

  const blurbPatch = payloads
    .flatMap(
      p =>
        (
          p as ExecutionResult & {
            incremental?: Array<{
              path?: Array<string | number>;
              label?: string;
              data?: Record<string, unknown>;
            }>;
          }
        ).incremental ?? [],
    )
    .find(
      inc =>
        inc.label === 'blurb' ||
        (Array.isArray(inc.path) &&
          inc.path.join('.') === 'product' &&
          inc.data?.['productBlurb'] != null),
    );
  expect(blurbPatch).toBeDefined();
  expect(blurbPatch?.path).toEqual(['product']);
  expect(blurbPatch?.label === 'blurb' || blurbPatch?.data?.['productBlurb'] != null).toBe(true);

  const merged = JSON.stringify(payloads);
  expect(merged).toContain('A carefully deferred product blurb');
  expect(merged).toContain('productBlurb');

  expect(recorded.queries.some(q => q.includes('@defer'))).toBe(true);
  expect(recorded.queries.some(q => q.includes('blurb') || q.includes('details'))).toBe(true);
  expect(recorded.blurbResolverCalls).toBeGreaterThan(0);

  expect(timings.length).toBe(payloads.length);
  expect(payloads.some(p => p.hasNext === false)).toBe(true);
});

it('surfaces deferred errors for transformed fields', async () => {
  const { gw } = await startGateway();
  const { hostname, port } = gw;

  const { payloads } = await collectMultipart(
    hostname,
    port,
    /* GraphQL */ `
      query ShopProductBoom {
        product(id: "1") {
          id
          title
          details {
            summary
            ... @defer(if: true, label: "boom") {
              boom
            }
          }
        }
      }
    `,
  );

  expect(payloads[0]).toMatchObject({
    data: {
      product: {
        id: '1',
        title: 'Widget',
        details: { summary: 'In stock' },
      },
    },
    hasNext: true,
  });

  const merged = JSON.stringify(payloads);
  expect(merged).toContain('deferred boom');
});
