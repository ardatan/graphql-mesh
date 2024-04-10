import { createTenv } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose();

  // TODO: we cant match snapshot because the schema is not stable
  expect(result).toContain(
    `type query_subreddit_data @source(subgraph: "Reddit", name: "query_subreddit_data")`,
  );
});

it.concurrent.each([
  {
    name: 'Subredit',
    query: /* GraphQL */ `
      query Subredit {
        subreddit(subreddit: "graphql") {
          kind
          data {
            dist
            modhash
            geo_filter
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
