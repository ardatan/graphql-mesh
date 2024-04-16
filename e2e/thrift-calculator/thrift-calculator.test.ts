import { parse } from 'graphql';
import { createTenv } from '@e2e/tenv';
import { getExecutorForFusiongraph } from '@graphql-mesh/fusion-runtime';

const { compose, service } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
    services: [await service('calculator')],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it.concurrent.each([
  {
    name: 'Add',
    document: parse(/* GraphQL */ `
      query Add {
        add(request: { left: 2, right: 3 })
      }
    `),
  },
])('should execute $name', async ({ document }) => {
  const { result } = await compose({
    services: [await service('calculator')],
  });

  const { fusiongraphExecutor } = getExecutorForFusiongraph({ fusiongraph: result });

  await expect(fusiongraphExecutor({ document })).resolves.toMatchSnapshot();
});
