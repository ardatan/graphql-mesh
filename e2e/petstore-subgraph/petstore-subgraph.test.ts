import { parse } from 'graphql';
import { createTenv, type Container } from '@e2e/tenv';
import { composeServices } from '@theguild/federation-composition';

const { compose, fs, serve, container } = createTenv(__dirname);

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

it('should be composable with Hive composition and serve correctly', async () => {
  const subgraphSdlGeneration = await compose({
    services: [petstore],
    args: ['--subgraph=petstore'],
  });
  const compositionResult = composeServices([
    {
      name: 'petstore',
      url: `http://localhost:${petstore.port}/api/v3`,
      typeDefs: parse(subgraphSdlGeneration.result),
    },
  ]);
  if (compositionResult.errors) {
    for (const error of compositionResult.errors) {
      console.error(error);
    }
    throw new Error('Composition failed');
  }
  if (!compositionResult.supergraphSdl) {
    throw new Error('Composition did not return a supergraph');
  }
  const supergraphFile = await fs.tempfile('supergraph.graphql', compositionResult.supergraphSdl);
  const { execute } = await serve({
    supergraph: supergraphFile,
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
        id: '1',
      },
    },
  });
});
