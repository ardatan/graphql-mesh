import { createTenv } from '@e2e/tenv';

it.concurrent('works', async () => {
  await using tenv = createTenv(__dirname);
  await using foo = await tenv.service('foo');
  await using bar = await tenv.service('bar');
  await using composition = await tenv.compose({
    services: [foo, bar],
    output: 'graphql',
  });
  await using gw = await tenv.gateway({ supergraph: composition.supergraphPath });
  await expect(
    gw.execute({
      query: /* GraphQL */ `
        query FooBarFoo {
          foo {
            id
            bar {
              id
              foo {
                id
              }
            }
          }
        }
      `,
    }),
  ).resolves.toMatchSnapshot();
});
