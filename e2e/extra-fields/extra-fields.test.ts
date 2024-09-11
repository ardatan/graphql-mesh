import { createTenv } from '@e2e/tenv';

const { serve, compose, service } = createTenv(__dirname);

it('works', async () => {
  const { output } = await compose({
    services: [await service('foo'), await service('bar')],
    output: 'graphql',
  });
  const { execute } = await serve({ supergraph: output });
  await expect(
    execute({
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
