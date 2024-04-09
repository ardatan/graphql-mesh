import { parse } from 'graphql';
import { createTenv } from '@e2e/tenv';
import { getExecutorForFusiongraph } from '@graphql-mesh/fusion-runtime';

const { compose } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose();
  expect(result).toMatchSnapshot();
});

it.concurrent.each([
  {
    name: 'MovieWithActedIn',
    document: parse(/* GraphQL */ `
      query MovieWithActedIn {
        movies(options: { limit: 2 }) {
          title
          released
          tagline
          peopleActedIn(options: { limit: 2 }) {
            name
          }
        }
      }
    `),
  },
])('should execute $name', async ({ document }) => {
  const { result } = await compose();

  const { fusiongraphExecutor } = getExecutorForFusiongraph({ fusiongraph: result });

  await expect(fusiongraphExecutor({ document })).resolves.toMatchSnapshot();
});
