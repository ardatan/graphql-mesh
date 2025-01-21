import { createTenv } from '@e2e/tenv';

const { compose, gateway } = createTenv(__dirname);

it.concurrent('should compose the appropriate schema', async () => {
  const { supergraphSdl: result } = await compose();
  expect(result).toMatchSnapshot();
});

it.concurrent.each([
  {
    name: 'TestQuery',
    query: /* GraphQL */ `
      query TestQuery {
        alignment_and_tree(limit: 5) {
          rfam_acc
          family(limit: 1) {
            type
            description
            comment
            author
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
