import { createTenv, type Container } from '@e2e/tenv';

const { compose, serve, container } = createTenv(__dirname);

let mysql: Container;

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

it('should compose the appropriate schema', async () => {
  const composition = await compose({
    services: [mysql],
    maskServicePorts: true,
  });
  expect(composition.result).toMatchSnapshot();
});

it('should execute GetSomeEmployees', async () => {
  const composition = await compose({ output: 'graphql', services: [mysql] });
  const gw = await serve({ supergraph: composition.output });
  const res = await gw.execute({
    query: /* GraphQL */ `
      query GetSomeEmployees {
        employees(limit: 5, orderBy: [ID_ASC]) {
          __typename
          id
          # TODO: dates are different in GH actions
          # birthDate
          firstName
          lastName
          gender
          # TODO: dates are different in GH actions
          # hireDate
          deptEmps {
            empNo
            deptNo
            # TODO: dates are different in GH actions
            # fromDate
            # toDate
            department {
              id
              deptName
            }
          }
        }
      }
    `,
  });
  expect(res).toMatchSnapshot();
});
