import { getIntrospectionQuery } from 'graphql';
import { createTenv } from '@e2e/tenv';
import { normalizeIntrospection } from '../../packages/testing/normalizeIntrospection.cjs';

const { serve, service } = createTenv(__dirname);
const introspectionQuery = getIntrospectionQuery({
  experimentalDirectiveDeprecation: false,
  typeDepth: 7,
});

it('should serve a schema from a url without pathname', async () => {
  const cdn = await service('cdn');

  const { execute } = await serve({
    supergraph: `http://localhost:${cdn.port}`,
  });

  await expect(
    execute({ query: introspectionQuery }).then(normalizeIntrospection),
  ).resolves.toMatchSnapshot();
});

it('should serve a schema from a url with pathname', async () => {
  const cdn = await service('cdn');

  const { execute } = await serve({
    supergraph: `http://localhost:${cdn.port}/schema`,
  });

  await expect(
    execute({ query: introspectionQuery }).then(normalizeIntrospection),
  ).resolves.toMatchSnapshot();
});

it('should serve a schema from a url with pathname and extension', async () => {
  const cdn = await service('cdn');

  const { execute } = await serve({
    supergraph: `http://localhost:${cdn.port}/schema.graphql`,
  });

  await expect(
    execute({ query: introspectionQuery }).then(normalizeIntrospection),
  ).resolves.toMatchSnapshot();
});
