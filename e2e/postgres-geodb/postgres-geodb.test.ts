import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createTenv, type Container } from '@e2e/tenv';

const { compose, serve, container } = createTenv(__dirname);

/** Pinned fixture — do not follow `master` (schema drift breaks snapshots). */
const WORLD_SQL_COMMIT = 'd951b5f733e26eb8707dc57c3186f2ccff0fa4f2';
const WORLD_SQL_URL = `https://raw.githubusercontent.com/morenoh149/postgresDBSamples/${WORLD_SQL_COMMIT}/worldDB-1.0/world.sql`;
const WORLD_SQL_SHA256 = '83906076caf5361d3aa61ce1c58b52b0baafec082bb090213fb7a501a9ac1194';

let postgres: Container;

jest.setTimeout(120_000);

async function ensureWorldSql(worldSqlPath: string): Promise<void> {
  const verify = async (buf: Buffer) => {
    const digest = createHash('sha256').update(buf).digest('hex');
    if (digest !== WORLD_SQL_SHA256) {
      throw new Error(`world.sql checksum mismatch: expected ${WORLD_SQL_SHA256}, got ${digest}`);
    }
  };
  if (existsSync(worldSqlPath)) {
    await verify(await readFile(worldSqlPath));
    return;
  }
  const res = await fetch(WORLD_SQL_URL);
  if (!res.ok) {
    throw new Error(`Failed to download world.sql: ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await verify(buf);
  await writeFile(worldSqlPath, buf);
}

beforeAll(async () => {
  const worldSqlPath = join(__dirname, 'world.sql');
  await ensureWorldSql(worldSqlPath);

  postgres = await container({
    name: 'geodb',
    image: 'postgres:16-alpine',
    containerPort: 5432,
    healthcheck: ['CMD-SHELL', 'pg_isready -h 127.0.0.1 -U postgres'],
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
