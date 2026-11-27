import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServicePortOpt } from '@e2e/opts';
import { createTenv, type Service } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';
import { composeSupergraphWithRover } from '../utils/apolloRover.js';

/**
 * Four Mesh subgraphs via `buildSubgraphSchema`, composed with **Apollo Rover**,
 * served by **Apollo Router**.
 *
 * Each subgraph SDL lives once under `subgraphs/<name>.graphql` — services load
 * it for `buildSubgraphSchema`; Rover discovers the same files by convention and
 * composes from each running subgraph's Federation-facing `_service { sdl }`.
 *
 * Run: `yarn test:e2e e2e/mesh-subgraph-apollo-router`
 */
describe('buildSubgraphSchema + Apollo Rover + Apollo Router', () => {
  jest.retryTimes(2);
  const { serve, service } = createTenv(__dirname);

  let users: Service;
  let productsUpstream: Service;
  let products: Service;
  let inventoryUpstream: Service;
  let inventory: Service;
  let reviews: Service;
  let workDir: string;
  let supergraphPath: string;

  beforeAll(async () => {
    users = await service('users');
    productsUpstream = await service('products-upstream');
    products = await service('products', {
      args: [createServicePortOpt('products-upstream', productsUpstream.port)],
    });
    inventoryUpstream = await service('inventory-upstream');
    inventory = await service('inventory', {
      args: [createServicePortOpt('inventory-upstream', inventoryUpstream.port)],
    });
    reviews = await service('reviews');

    workDir = await mkdtemp(join(tmpdir(), 'mesh-subgraph-rover-'));
    const composed = await composeSupergraphWithRover({
      workDir,
      schemasDir: join(__dirname, 'subgraphs'),
      subgraphs: [
        { name: 'users', routingUrl: `http://127.0.0.1:${users.port}/graphql` },
        { name: 'products', routingUrl: `http://127.0.0.1:${products.port}/graphql` },
        { name: 'inventory', routingUrl: `http://127.0.0.1:${inventory.port}/graphql` },
        { name: 'reviews', routingUrl: `http://127.0.0.1:${reviews.port}/graphql` },
      ],
    });
    supergraphPath = composed.supergraphPath;
  }, 120_000);

  afterAll(async () => {
    if (workDir) {
      await rm(workDir, { recursive: true, force: true });
    }
  });

  async function hits(svc: Service): Promise<number> {
    const res = await fetch(`http://${svc.hostname}:${svc.port}/_hits`);
    const body = (await res.json()) as { graphqlHits: number };
    return body.graphqlHits;
  }

  it('federated query hits all four Mesh subgraph paths', async () => {
    const before = {
      users: await hits(users),
      products: await hits(products),
      productsUpstream: await hits(productsUpstream),
      inventory: await hits(inventory),
      inventoryUpstream: await hits(inventoryUpstream),
      reviews: await hits(reviews),
    };

    const { execute } = await serve({
      runner: 'apollo-router',
      supergraph: supergraphPath,
    });

    const result = await execute({
      query: /* GraphQL */ `
        query {
          review(id: "r1") {
            id
            body
            product {
              id
              name
              inStock
              reviews {
                id
                body
              }
            }
            author {
              id
              name
            }
          }
          product(id: "1") {
            id
            name
            inStock
          }
          user(id: "u1") {
            id
            name
          }
        }
      `,
    });

    expect(result.errors).toBeFalsy();
    expect(result.data).toEqual({
      review: {
        id: 'r1',
        body: 'Great widget',
        product: {
          id: '1',
          name: 'Mesh Widget',
          inStock: true,
          reviews: [{ id: 'r1', body: 'Great widget' }],
        },
        author: { id: 'u1', name: 'Ada' },
      },
      product: { id: '1', name: 'Mesh Widget', inStock: true },
      user: { id: 'u1', name: 'Ada' },
    });

    expect(await hits(users)).toBeGreaterThan(before.users);
    expect(await hits(products)).toBeGreaterThan(before.products);
    expect(await hits(productsUpstream)).toBeGreaterThan(before.productsUpstream);
    expect(await hits(inventory)).toBeGreaterThan(before.inventory);
    expect(await hits(inventoryUpstream)).toBeGreaterThan(before.inventoryUpstream);
    expect(await hits(reviews)).toBeGreaterThan(before.reviews);
  });
});
