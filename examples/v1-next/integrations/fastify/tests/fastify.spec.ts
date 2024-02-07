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

  afterAll(() => {
    app.close();
    upstream.close();
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
            pet_by_petId(petId: "pet200") {
              name
            }
          }
        `,
      }),
    });

    const json = await response.json();
    expect(json).toMatchObject({
      data: {
        pet_by_petId: {
          name: 'Bob',
        },
      },
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
            pet_by_petId(petId: "pet500") {
              name
            }
          }
        `,
      }),
    });

    const resJson = await response.json();

    expect(resJson).toEqual({
      data: { pet_by_petId: null },
      errors: [
        {
          message: 'HTTP Error: 500, Could not invoke operation GET /pet/{args.petId}',
          path: ['pet_by_petId'],
          extensions: {
            planNodeId: 0,
            request: { url: 'http://localhost:4001/pet/pet500', method: 'GET' },
            responseJson: { error: 'Error' },
          },
        },
      ],
    });
  });
});
