import { createTenv, type ServeRunner } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose();
  expect(result).toMatchSnapshot();
});

describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
  it.concurrent.each([
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
    {
      name: 'viewsInPastMonth',
      // Hive gateway additionalResolvers; Apollo Router has no Mesh runtime resolvers.
      hiveOnly: true as boolean,
      query: /* GraphQL */ `
        query ViewsInPastMonth {
          viewsInPastMonth(project: "en.wikipedia.org")
        }
      `,
    },
  ])('should execute $name', async ({ query, hiveOnly }) => {
    if (hiveOnly && runner === 'apollo-router') {
      return;
    }
    const composition = await compose({ output: 'graphql' });
    const { execute } = await serve({
      runner,
      supergraph: composition.output,
    });
    await expect(execute({ query })).resolves.toMatchSnapshot();
  });
});
