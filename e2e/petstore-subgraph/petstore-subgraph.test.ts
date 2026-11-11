import { createTenv, type Container, type ServeRunner } from '@e2e/tenv';

const { compose, serve, container } = createTenv(__dirname);

let petstore!: Container;
beforeAll(async () => {
  petstore = await container({
    name: 'petstore',
    image: 'swaggerapi/petstore3:1.0.7',
    containerPort: 8080,
    healthcheck: ['CMD-SHELL', 'wget --spider http://localhost:8080'],
  });
});

it('should generate the subgraph schema correctly', async () => {
  const { result } = await compose({
    services: [petstore],
    maskServicePorts: true,
    args: ['--subgraph=petstore'],
  });
  expect(result).toMatchSnapshot();
});

describe.each(['hive', 'apollo-router'] as ServeRunner[])('compose + serve with %s', runner => {
  it('should execute getPetById', async () => {
    const composition = await compose({
      services: [petstore],
      output: 'graphql',
    });
    const { execute } = await serve({
      runner,
      supergraph: composition.output,
    });
    const executionResult = await execute({
      query: /* GraphQL */ `
        query {
          getPetById(petId: 1) {
            id
          }
        }
      `,
    });
    expect(executionResult).toEqual({
      data: {
        getPetById: {
          id: 1,
        },
      },
    });
  });
});
