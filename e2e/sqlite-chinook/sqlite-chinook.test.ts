import { createTenv } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose({ trimHostPaths: true });
  expect(result).toMatchSnapshot();
});

it.concurrent.each([
  {
    name: 'Albums',
    query: /* GraphQL */ `
      query Albums {
        albums(limit: 2) {
          id
          title
          artist {
            name
          }
        }
      }
    `,
  },
  {
    name: 'PlaylistTracksManyToMany',
    query: /* GraphQL */ `
      query PlaylistTracksManyToMany {
        playlist(id: "9") {
          id
          name
          tracks(limit: 5, orderBy: [ID_ASC]) {
            id
            name
          }
        }
      }
    `,
  },
])('should execute $name', async ({ query }) => {
  const { output } = await compose({ output: 'graphql' });

  const { execute } = await serve({ supergraph: output });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
