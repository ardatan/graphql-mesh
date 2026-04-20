import { createTenv } from '@e2e/tenv';

it('works', async () => {
  const { container, compose, service, serve } = createTenv(__dirname);
  await using Subgraph1 = await service('Subgraph1');
  await using Subgraph2 = await service('Subgraph2');
  await using composition = await compose({ output: 'graphql', services: [Subgraph1, Subgraph2] });
  await using gw = await serve({ supergraph: composition.output });
  const res = await gw.execute({
    query: /* GraphQL */ `
      query {
        Subgraph2 {
          targetQuery {
            targets {
              id
              complexDataItem {
                key
                value
              }
            }
          }
        }
      }
    `,
  });
  expect(res.data).toEqual({
    Subgraph2: {
      targetQuery: {
        targets: [
          {
            id: 'nullish',
            complexDataItem: null,
          },
          {
            id: 'empty',
            complexDataItem: null,
          },
          {
            id: 'full',
            complexDataItem: {
              key: 'full',
              value: 'This is full data',
            },
          },
        ],
      },
    },
  });
});
