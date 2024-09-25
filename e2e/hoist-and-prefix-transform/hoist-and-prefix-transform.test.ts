import { createTenv } from '@e2e/tenv';

const { compose, serve, service, fs } = createTenv(__dirname);

it('should compose and execute', async () => {
  const { output } = await compose({ output: 'graphql', services: [await service('users')] });

  // hoisted
  await expect(fs.read(output)).resolves.toContain('users(limit: Int!, page: Int) : [User!]!');

  const { execute } = await serve({ supergraph: output });
  await expect(
    execute({
      query: /* GraphQL */ `
        {
          users(limit: 7) {
            id
          }
        }
      `,
    }),
  ).resolves.toEqual({ data: { users: [{ id: '1' }, { id: '2' }, { id: '3' }] } });
});
