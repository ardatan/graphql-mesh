import { createTenv, type Container } from '@e2e/tenv';

const { compose, container, serve, spawn } = createTenv(__dirname);

let neo4j: Container;
beforeAll(async () => {
  neo4j = await container({
    name: 'neo4j',
    image: 'neo4j:5.22.0',
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
  const { result } = await compose({
    services: [neo4j],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it.concurrent.each([
  {
    name: 'MovieWithActedIn',
    query: /* GraphQL */ `
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
    `,
  },
])('should execute $name', async ({ query }) => {
  const { output } = await compose({
    services: [neo4j],
    output: 'graphql',
  });
  const { execute } = await serve({ supergraph: output });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
