import { createTenv, type Container } from '@e2e/tenv';

const { compose, container, serve, spawn } = createTenv(__dirname);

let neo4j: Container;

beforeAll(async () => {
  neo4j = await container({
    name: 'neo4j',
    image: 'neo4j',
    containerPort: 7687,
    env: {
      NEO4J_AUTH: 'neo4j/password',
    },
    volumes: [
      {
        host: 'movies.cypher',
        container: '/backups/movies.cypher',
      },
    ],
    healthcheck: ['CMD-SHELL', 'wget --spider http://localhost:7474'],
  });

  const [, waitForLoad] = await spawn([
    'docker',
    'exec',
    neo4j.containerName,
    'bash',
    '-c',
    'cypher-shell -u neo4j -p password -f /backups/movies.cypher',
  ]);
  await waitForLoad;
});

it('should compose the appropriate schema', async () => {
  const composition = await compose({
    services: [neo4j],
    maskServicePorts: true,
  });
  expect(composition.result).toMatchSnapshot();
});

it('should execute MovieWithActedIn', async () => {
  const composition = await compose({
    services: [neo4j],
    output: 'graphql',
  });
  const gw = await serve({ supergraph: composition.output });
  const result = await gw.execute({
    query: /* GraphQL */ `
      query MovieWithActedIn {
        movies(limit: 2) {
          title
          tagline
          peopleActedIn(limit: 2) {
            name
          }
        }
      }
    `,
  });
  expect(result).toMatchInlineSnapshot(`
{
  "data": {
    "movies": [
      {
        "peopleActedIn": [
          {
            "name": "Emil Eifrem",
          },
          {
            "name": "Hugo Weaving",
          },
        ],
        "tagline": "Welcome to the Real World",
        "title": "The Matrix",
      },
      {
        "peopleActedIn": [
          {
            "name": "Hugo Weaving",
          },
          {
            "name": "Laurence Fishburne",
          },
        ],
        "tagline": "Free your mind",
        "title": "The Matrix Reloaded",
      },
    ],
  },
}
`);
});
