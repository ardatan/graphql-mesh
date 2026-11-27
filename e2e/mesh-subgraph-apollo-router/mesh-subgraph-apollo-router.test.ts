import { createServicePortOpt } from '@e2e/opts';
import { createTenv, type Service } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';

/**
 * Proves `@graphql-mesh/subgraph` `buildSubgraphSchema` output works with
 * Apollo Router: Mesh `@connect` / `@lookup` execute on the subgraph GraphQL
 * server (Router delegates GraphQL; it does not natively execute those Mesh
 * directives for this path).
 *
 * Run: `yarn test:e2e e2e/mesh-subgraph-apollo-router`
 */
describe('buildSubgraphSchema + Apollo Router', () => {
  jest.retryTimes(2);
  const { compose, serve, service } = createTenv(__dirname);

  let rest: Service;
  let products: Service;
  let reviews: Service;

  beforeAll(async () => {
    rest = await service('rest');
    products = await service('products', {
      args: [createServicePortOpt('rest', rest.port)],
    });
    reviews = await service('reviews');
  });

  async function productsGraphqlHits(): Promise<number> {
    const res = await fetch(`http://${products.hostname}:${products.port}/_hits`);
    const body = (await res.json()) as { graphqlHits: number };
    return body.graphqlHits;
  }

  it('Apollo Router query executes Mesh @connect via the subgraph GraphQL server', async () => {
    const hitsBefore = await productsGraphqlHits();

    const composition = await compose({
      output: 'graphql',
      services: [rest, products, reviews],
    });

    const { execute } = await serve({
      runner: 'apollo-router',
      supergraph: composition.output,
    });

    const result = await execute({
      query: /* GraphQL */ `
        query {
          product(id: "1") {
            id
            name
          }
        }
      `,
    });

    expect(result.errors).toBeFalsy();
    expect(result.data).toEqual({
      product: { id: '1', name: 'Mesh Widget' },
    });

    const hitsAfter = await productsGraphqlHits();
    // Router must have delegated a GraphQL operation to our Mesh subgraph.
    // Native Connectors on the Router would hit REST without incrementing this.
    expect(hitsAfter).toBeGreaterThan(hitsBefore);
  });

  it('Apollo Router entity hop uses Mesh @lookup on the products subgraph', async () => {
    const composition = await compose({
      output: 'graphql',
      services: [rest, products, reviews],
    });

    const { execute } = await serve({
      runner: 'apollo-router',
      supergraph: composition.output,
    });

    const hitsBefore = await productsGraphqlHits();
    const result = await execute({
      query: /* GraphQL */ `
        query {
          review(id: "r1") {
            id
            body
            product {
              id
              name
            }
          }
        }
      `,
    });

    expect(result.errors).toBeFalsy();
    expect(result.data).toEqual({
      review: {
        id: 'r1',
        body: 'Great widget',
        product: { id: '1', name: 'Mesh Widget' },
      },
    });
    // Entity fill for Product.name must hit the Mesh products GraphQL server
    // (`_entities` → `@lookup` → `@connect`), not Router-native Connectors.
    expect(await productsGraphqlHits()).toBeGreaterThan(hitsBefore);
  });
});
