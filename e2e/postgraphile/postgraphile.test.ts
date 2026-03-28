import { createTenv, type Container } from '@e2e/tenv';

const { compose, container, serve } = createTenv(__dirname);

let postgres: Container;

beforeAll(async () => {
  postgres = await container({
    name: 'postgres',
    image: 'postgres:16-alpine',
    containerPort: 5432,
    env: {
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'password',
      POSTGRES_DB: 'library',
    },
    volumes: [
      {
        host: 'seed.sql',
        container: '/docker-entrypoint-initdb.d/seed.sql',
      },
    ],
    healthcheck: ['CMD-SHELL', 'pg_isready -U postgres'],
  });
});

it('should compose the appropriate schema', async () => {
  const composition = await compose({
    services: [postgres],
    maskServicePorts: true,
  });
  expect(composition.result).toMatchSnapshot();
});

it('should execute BooksWithAuthors', async () => {
  const composition = await compose({
    services: [postgres],
    output: 'graphql',
  });
  const gw = await serve({ supergraph: composition.output });
  const result = await gw.execute({
    query: /* GraphQL */ `
      query BooksWithAuthors {
        allBooks(orderBy: [ID_ASC], first: 2) {
          nodes {
            title
            year
            authorByAuthorId {
              name
            }
          }
        }
      }
    `,
  });
  expect(result).toMatchSnapshot();
});
