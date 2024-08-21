import os from 'os';
import { createTbench, type Tbench, type TbenchResult } from '@e2e/tbench';
import { createTenv, type Container } from '@e2e/tenv';

const { compose, serve, container } = createTenv(__dirname);

let tbench: Tbench;
beforeAll(async () => {
  tbench = await createTbench(
    // to give space for jest and the serve process.
    os.availableParallelism() - 2,
  );
});

let mysql!: Container;
beforeAll(async () => {
  mysql = await container({
    name: 'employees',
    image: 'genschsa/mysql-employees',
    containerPort: 3306,
    healthcheck: [
      'CMD',
      'mysqladmin',
      'ping',
      '--host=127.0.0.1', // use the network connection (and not the socket file). making sure we dont check the temporary/setup database
    ],
    env: {
      MYSQL_ROOT_PASSWORD: 'passwd', // used in mesh.config.ts
    },
  });
});

const threshold: TbenchResult = {
  maxCpu: Infinity, // we dont care
  maxMem: 500, // MB
  slowestRequest: 1, // second
};

it(`should perform within threshold ${JSON.stringify(threshold)}`, async () => {
  const { output } = await compose({ output: 'graphql', services: [mysql] });
  const server = await serve({ supergraph: output });
  const result = await tbench.sustain({
    server,
    params: {
      query: /* GraphQL */ `
        query GetSomeEmployees {
          employees(limit: 5, orderBy: { emp_no: asc }) {
            __typename
            emp_no
            # TODO: dates are different in GH actions
            # birth_date
            first_name
            last_name
            gender
            # TODO: dates are different in GH actions
            # hire_date
            dept_emp {
              emp_no
              dept_no
              # TODO: dates are different in GH actions
              # from_date
              # to_date
              departments {
                dept_no
                dept_name
              }
            }
          }
        }
      `,
    },
  });

  console.debug(result);

  expect(result.maxCpu).toBeLessThan(threshold.maxCpu);
  expect(result.maxMem).toBeLessThan(threshold.maxMem);
  expect(result.slowestRequest).toBeLessThan(threshold.slowestRequest);
});
