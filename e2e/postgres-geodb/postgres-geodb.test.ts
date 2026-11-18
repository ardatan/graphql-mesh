import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createTenv, type Container } from '@e2e/tenv';

const { compose, serve, container } = createTenv(__dirname);

const WORLD_SQL_URL =
  'https://raw.githubusercontent.com/morenoh149/postgresDBSamples/master/worldDB-1.0/world.sql';

let postgres: Container;

jest.setTimeout(120_000);

beforeAll(async () => {
  const worldSqlPath = join(__dirname, 'world.sql');
  if (!existsSync(worldSqlPath)) {
    const res = await fetch(WORLD_SQL_URL);
    if (!res.ok) {
      throw new Error(`Failed to download world.sql: ${res.status} ${res.statusText}`);
    }
    await writeFile(worldSqlPath, Buffer.from(await res.arrayBuffer()));
  }

  postgres = await container({
    name: 'geodb',
    image: 'postgres:16-alpine',
    containerPort: 5432,
    healthcheck: ['CMD-SHELL', 'pg_isready -U postgres'],
    env: {
      POSTGRES_PASSWORD: 'docker',
    },
    // Official image runs *.sql in this dir on first init (before ready).
    volumes: [
      {
        host: 'world.sql',
        container: '/docker-entrypoint-initdb.d/01-world.sql',
      },
    ],
  });
});

it('should compose the appropriate schema', async () => {
  const composition = await compose({
    services: [postgres],
    maskServicePorts: true,
  });
  expect(composition.result).toMatchSnapshot();
});

it('should execute cities and country capital', async () => {
  const composition = await compose({ output: 'graphql', services: [postgres] });
  const gw = await serve({ supergraph: composition.output });
  const res = await gw.execute({
    query: /* GraphQL */ `
      query GeoSmoke {
        cities(limit: 3, orderBy: [ID_ASC]) {
          id
          name
          countrycode
          district
        }
        country(id: "NLD") {
          id
          name
          continent
          city {
            name
          }
        }
      }
    `,
  });
  expect(res).toMatchSnapshot();
});
