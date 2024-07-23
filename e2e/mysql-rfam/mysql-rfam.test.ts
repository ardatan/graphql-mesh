import { createTenv } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose();
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
  const { output } = await compose({ output: 'graphql' });
  const { execute } = await serve({ supergraph: output });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
