import { fetch } from '@whatwg-node/fetch';
import { app } from '../src/app';
import { upstream } from '../src/upstream';

describe('fastify', () => {
  beforeAll(async () => {
    await app.listen({
      port: 4000,
    });
    await upstream.listen({
      port: 4001,
    });
  });

  afterAll(async () => {
    await app.close();
    await upstream.close();
  });

  it('should work', async () => {
    const response = await fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          {
            pet_by_petId(petId: "0fc9111f-570d-4ebe-a72e-ff4eb274bc65"){
              __typename
              ... on Pet {
                  id
              }
              ... on Error {
                  errors
              }
          }
          }
        `,
      }),
    });

    const json = await response.json();
    expect(json).toEqual({
      data: {
        pet_by_petId: {
          "__typename": "Pet",
          "id": "0fc9111f-570d-4ebe-a72e-ff4eb274bc65",
        },
      }
    });
  });

  it('should work too', async () => {
    const response = await fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          {
            newPet(extraId: "dbd9e7c1-24f1-42e8-bd34-e7ce5bbafd7b", petId: "0fc9111f-570d-4ebe-a72e-ff4eb274bc65"){
                __typename
                ... on Error {
                    errors
                }
                ... on NewPetResponse {
                    foo
                }
            }
          }
        `,
      }),
    });

    const json = await response.json();
    expect(json).toEqual({
      data: {
        "newPet": {
          "__typename": "NewPetResponse",
          "foo": "{\"__typename\":\"Pet\", \"id\": \"0fc9111f-570d-4ebe-a72e-ff4eb274bc65\"}",
        }
      }
    });
  });
});
