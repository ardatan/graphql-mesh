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
        family(limit: 3) {
          rfam_acc
          rfam_id
          description
          type
        }
      }
    `,
  },
])('should execute $name', async ({ query }) => {
  const { output } = await compose({ output: 'graphql' });
  const { execute } = await serve({ supergraph: output });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
