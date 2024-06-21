import os from 'os';
import { createTbench, Tbench, TbenchResult } from '@e2e/tbench';
import { Container, createTenv } from '@e2e/tenv';

const { serve, compose, service, container } = createTenv(__dirname);

let tbench: Tbench;
let petstore!: Container;
beforeAll(async () => {
  tbench = await createTbench(
    // to give space for jest and the serve process.
    os.availableParallelism() - 2,
  );
  petstore = await container({
    name: 'petstore',
    image: 'swaggerapi/petstore3:1.0.7',
    containerPort: 8080,
    healthcheck: ['CMD-SHELL', 'wget --spider http://0.0.0.0:8080'],
  });
});

const threshold: TbenchResult = {
  maxCpu: Infinity, // we dont care
  maxMem: 500, // MB
  slowestRequest: 1, // second
};

it(`should perform within threshold ${JSON.stringify(threshold)}`, async () => {
  const { output } = await compose({
    services: [petstore, await service('vaccination')],
    output: 'graphql',
    pipeLogs: true,
  });
  const server = await serve({ supergraph: output });
  const result = await tbench.sustain({
    server,
    params: {
      query: /* GraphQL */ `
        query GetPet {
          getPetById(petId: 1) {
            __typename
            id
            name
            vaccinated
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
