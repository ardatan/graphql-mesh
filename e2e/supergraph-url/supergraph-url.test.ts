import { getIntrospectionQuery } from 'graphql';
import { createTenv } from '@e2e/tenv';

const { gateway, service } = createTenv(__dirname);

it.concurrent('should serve a schema from a url without pathname', async () => {
  const cdn = await service('cdn');

  const { execute } = await gateway({
    supergraph: `http://localhost:${cdn.port}`,
  });

  await expect(execute({ query: getIntrospectionQuery() })).resolves.toMatchSnapshot();
});

it.concurrent('should serve a schema from a url with pathname', async () => {
  const cdn = await service('cdn');

  const { execute } = await gateway({
    supergraph: `http://localhost:${cdn.port}/schema`,
  });

  await expect(execute({ query: getIntrospectionQuery() })).resolves.toMatchSnapshot();
});

it.concurrent('should serve a schema from a url with pathname and extension', async () => {
  const cdn = await service('cdn');

  const { execute } = await gateway({
    supergraph: `http://localhost:${cdn.port}/schema.graphql`,
  });

  await expect(execute({ query: getIntrospectionQuery() })).resolves.toMatchSnapshot();
});
