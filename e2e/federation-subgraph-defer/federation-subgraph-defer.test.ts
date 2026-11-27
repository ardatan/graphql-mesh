import type { ExecutionResult } from 'graphql';
import { meros } from 'meros/browser';
import { createTenv } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';

/**
 * Dedicated e2e for `deferStream: { subgraph: true }`.
 * Port of Hive Gateway `e2e/federation-subgraph-defer`.
 */
const { serve, service, composeWithApollo } = createTenv(__dirname);

it('forwards @defer to a subgraph and flushes before the slow field', async () => {
  const catalog = await service('catalog');
  const { output } = await composeWithApollo({
    services: [catalog],
  });
  const { hostname, port } = await serve({ supergraph: output });

  const t0 = Date.now();
  const res = await fetch(`http://${hostname}:${port}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'multipart/mixed;deferSpec=20220824',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query CatalogProduct {
          product(id: "1") {
            id
            name
            ... @defer(label: "description") {
              description
            }
          }
        }
      `,
    }),
  });

  expect(res.ok).toBe(true);
  expect(res.headers.get('content-type')).toContain('multipart/mixed');

  const parts = await meros<ExecutionResult>(res);
  if (!('next' in parts)) {
    throw new Error('Expected an async iterable of multipart parts');
  }

  type IncrementalPayload = ExecutionResult & {
    hasNext?: boolean;
    incremental?: Array<{
      path?: Array<string | number>;
      label?: string;
      data?: Record<string, unknown>;
    }>;
  };
  const payloads: IncrementalPayload[] = [];
  let firstPartAt = 0;
  for await (const part of parts) {
    if (!part.json) continue;
    if (payloads.length === 0) {
      firstPartAt = Date.now() - t0;
    }
    payloads.push(part.body as IncrementalPayload);
  }

  expect(payloads.length).toBeGreaterThan(1);
  expect(payloads[0]).toMatchObject({
    data: { product: { id: '1', name: 'Widget' } },
    hasNext: true,
  });
  expect(
    (payloads[0]?.data as { product?: { description?: string } })?.product?.description,
  ).toBeUndefined();

  const descriptionPatch = payloads
    .flatMap(p => p.incremental ?? [])
    .find(
      inc =>
        inc.label === 'description' ||
        inc.data?.['description'] != null ||
        (Array.isArray(inc.path) && inc.path.join('.') === 'product' && inc.data != null),
    );
  expect(descriptionPatch).toBeDefined();
  expect(descriptionPatch?.path).toEqual(['product']);
  expect(
    descriptionPatch?.label === 'description' || descriptionPatch?.data?.['description'] != null,
  ).toBe(true);
  expect(JSON.stringify(payloads)).toContain('A carefully deferred product description');

  const recorded = await fetch(`http://${catalog.hostname}:${catalog.port}/_queries`).then(
    r => r.json() as Promise<string[]>,
  );
  expect(recorded.some(q => q.includes('@defer'))).toBe(true);

  // First payload must arrive well before the deferred field (1000ms delay).
  // CI runners can take well over 100ms to flush the initial multipart part.
  expect(firstPartAt).toBeLessThan(400);
});
