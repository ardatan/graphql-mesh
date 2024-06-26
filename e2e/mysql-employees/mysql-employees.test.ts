import { Container, createTenv } from '@e2e/tenv';

const { compose, serve, container } = createTenv(__dirname);

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

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
    services: [mysql],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it.concurrent.each([
  {
    name: 'GetSomeEmployees',
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
])('should execute $name', async ({ query }) => {
  const { output } = await compose({ output: 'graphql', services: [mysql] });
  const { execute } = await serve({ supergraph: output });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
