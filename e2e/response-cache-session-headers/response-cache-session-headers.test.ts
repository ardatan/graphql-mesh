import { createTenv } from '@e2e/tenv';

const { compose, serve, service } = createTenv(__dirname);

it('does not share response cache entries across different session header values', async () => {
  const greeting = await service('greeting');
  const { output } = await compose({
    services: [greeting],
    output: 'graphql',
  });
  const { execute } = await serve({ supergraph: output });

  const query = /* GraphQL */ `
    query {
      greeting
    }
  `;

  await expect(
    execute({
      query,
      headers: { test: 'a' },
    }),
  ).resolves.toMatchObject({
    data: { greeting: 'hello' },
    extensions: {
      responseCache: {
        didCache: true,
        hit: false,
      },
    },
  });

  await expect(
    execute({
      query,
      headers: { test: 'a' },
    }),
  ).resolves.toMatchObject({
    data: { greeting: 'hello' },
    extensions: {
      responseCache: {
        hit: true,
      },
    },
  });

  // Changing the session header must miss (reproduces #5102)
  await expect(
    execute({
      query,
      headers: { test: 'b' },
    }),
  ).resolves.toMatchObject({
    data: { greeting: 'hello' },
    extensions: {
      responseCache: {
        didCache: true,
        hit: false,
      },
    },
  });

  await expect(
    execute({
      query,
      headers: { test: 'b' },
    }),
  ).resolves.toMatchObject({
    data: { greeting: 'hello' },
    extensions: {
      responseCache: {
        hit: true,
      },
    },
  });
});
