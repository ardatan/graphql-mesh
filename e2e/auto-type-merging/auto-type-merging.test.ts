import { createTenv, type Tenv } from '@e2e/tenv';

function createPetstore(tenv: Tenv) {
  return tenv.container({
    name: 'petstore',
    image: 'swaggerapi/petstore3:1.0.7',
    containerPort: 8080,
    healthcheck: ['CMD-SHELL', 'wget --spider http://localhost:8080'],
  });
}

it.concurrent('should compose the appropriate schema', async () => {
  await using tenv = createTenv(__dirname);
  await using petstore = await createPetstore(tenv);
  await using vaccination = await tenv.service('vaccination');
  const { supergraphSdl: result } = await tenv.compose({
    services: [petstore, vaccination],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it.concurrent('should execute GetPet', async () => {
  await using tenv = createTenv(__dirname);
  await using petstore = await createPetstore(tenv);
  await using vaccination = await tenv.service('vaccination');
  await using composition = await tenv.compose({
    output: 'graphql',
    services: [petstore, vaccination],
  });
  await using gw = await tenv.gateway({ supergraph: composition.supergraphPath });
  await expect(
    gw.execute({
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
    }),
  ).resolves.toMatchObject({
    data: {
      getPetById: {
        __typename: 'Pet',
        id: 1,
        name: 'Cat 1',
        vaccinated: false,
      },
    },
  });
});
