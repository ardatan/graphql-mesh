import { parse } from 'graphql';
import { createTenv } from '@e2e/tenv';
import { getExecutorForFusiongraph } from '@graphql-mesh/fusion-runtime';

const { compose } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose({ trimHostPaths: true });
  expect(result).toMatchSnapshot();
});

it.concurrent.each([
  {
    name: 'Albums',
    document: parse(/* GraphQL */ `
      query Albums {
        albums(limit: 2) {
          albumId
          title
          artist {
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
