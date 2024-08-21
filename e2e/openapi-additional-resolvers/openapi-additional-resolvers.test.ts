import { createTenv } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

it('should execute Metrics with banana', async () => {
  const { output } = await compose({ output: 'graphql' });
  const { execute } = await serve({ supergraph: output });
  const result = await execute({
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
            banana
          }
        }
      }
    `,
  });

  expect(result.errors).toBeFalsy();

  expect(
    result.data
      .metrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_end
      .banana,
  ).toEqual('🍌');
});

it('should execute Metrics with apple', async () => {
  const { output } = await compose({ output: 'graphql' });
  const { execute } = await serve({ supergraph: output });
  const result = await execute({
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
            apple
          }
        }
      }
    `,
  });

  expect(result.errors).toBeFalsy();
  expect(
    result.data
      .metrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_end
      .apple,
  ).toEqual('🍎');
});
