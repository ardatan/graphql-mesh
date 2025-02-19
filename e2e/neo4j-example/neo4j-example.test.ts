import { createTenv } from '@e2e/tenv';

const { compose, container, serve, spawn } = createTenv(__dirname);

const neo4jContainer = async () => {
  const neo4j = await container({
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
  return neo4j;
};

it('should compose the appropriate schema', async () => {
  const neo4j = await neo4jContainer();
  const composition = await compose({
    services: [neo4j],
    maskServicePorts: true,
  });
  expect(composition.result).toMatchSnapshot();
});

it('should execute MovieWithActedIn', async () => {
  const neo4j = await neo4jContainer();
  const composition = await compose({
    services: [neo4j],
    output: 'graphql',
  });
  const gw = await serve({ supergraph: composition.output });
  const result = await gw.execute({
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
  });
  expect(result).toMatchSnapshot();
});
