/**
 * Port of Hive Gateway `e2e/federation-example/federation-example.bench.ts`.
 * HTTP load against `@graphql-hive/gateway` (Stitching vs Router QP).
 * Package-level Stitching vs Apollo Gateway: `bench/federation/federation.bench.ts`.
 */
import path from 'node:path';
import { bench, describe, expect } from 'vitest';
import { fetch } from '@whatwg-node/fetch';
import { createTenv } from '../../e2e/utils/tenv';
import { benchConfig } from '../benchConfig';
import { exampleOperation } from '../federation/fixtures/exampleOperation';

const suiteDir = path.join(process.cwd(), 'bench/federation-example');

describe('Gateway', async () => {
  const { service, serve, composeWithApollo } = createTenv(suiteDir);

  const accounts = await service('accounts');
  const inventory = await service('inventory');
  const products = await service('products');
  const reviews = await service('reviews');
  const { output } = await composeWithApollo({
    services: [accounts, inventory, products, reviews],
  });

  const toolsGw = await serve({
    supergraph: output,
    env: {
      FORK: 1,
      NODE_ENV: 'production',
    },
  });

  const routerGw = await serve({
    supergraph: output,
    env: {
      FORK: 1,
      NODE_ENV: 'production',
      HIVE_ROUTER_RUNTIME: 1,
    },
  });

  const body = JSON.stringify({ query: exampleOperation.query });

  async function hit(port: number, hostname: string) {
    const response = await fetch(`http://${hostname || 'localhost'}:${port}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const data = await response.json();
    expect(data).toEqual(exampleOperation.result);
  }

  bench('Hive GW w/ Stitching', () => hit(toolsGw.port, toolsGw.hostname), benchConfig);

  bench('Hive GW w/ Router QP', () => hit(routerGw.port, routerGw.hostname), benchConfig);
});
