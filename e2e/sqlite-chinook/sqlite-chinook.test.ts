import { createTenv } from '@e2e/tenv';

const { compose, gateway } = createTenv(__dirname);

it.concurrent('should compose the appropriate schema', async () => {
  const { supergraphSdl: result } = await compose({ trimHostPaths: true });
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
  const { supergraphPath } = await compose({ output: 'graphql' });

  const { execute } = await gateway({ supergraph: supergraphPath });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
