import { createTenv } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose();
  expect(result).toMatchSnapshot();
});

it.concurrent.each([
  {
    name: 'ViewsInPastMonth',
    query: /* GraphQL */ `
      query ViewsInPastMonth {
        viewsInPastMonth(project: "en.wikipedia.org")
      }
    `,
  },
  {
    name: 'Metrics',
    query: /* GraphQL */ `
      query Metrics {
        metrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_end(
          access: all_access
          agent: user
          start: "20200101"
          end: "20200226"
          project: "en.wikipedia.org"
          granularity: daily
        ) {
          ... on pageview_project {
            items {
              views
            }
          }
        }
      }
    `,
  },
])('should execute $name', async ({ query }) => {
  const { output } = await compose({ output: 'graphql' });
  const { execute } = await serve({ fusiongraph: output });
  await expect(execute({ query })).resolves.toMatchObject({
    data: {
      viewsInPastMonth: expect.any(Number),
    },
  });
});
