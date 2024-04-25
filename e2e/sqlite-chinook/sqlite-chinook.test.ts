import { createTenv } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose({ trimHostPaths: true });
  expect(result).toMatchSnapshot();
});

it.concurrent.each([
  {
    name: 'Albums',
    query: /* GraphQL */ `
      query Albums {
        albums(limit: 2) {
          albumId
          title
          artist {
            name
          }
        }
      }
    `,
  },
])('should execute $name', async ({ query }) => {
  const { target } = await compose({ target: 'graphql' });

  const { execute } = await serve({ fusiongraph: target });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
