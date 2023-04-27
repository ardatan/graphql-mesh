import { fetch } from '@whatwg-node/fetch';
import { app } from '../src/app';
import { upstream } from '../src/upstream';

describe('fastify', () => {
  beforeAll(async () => {
    await app.listen({
      port: 4000,
    });
    await upstream.listen({
      port: 4001
    })
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
            pet_by_petId(petId: "pet200") {
              name
            }
          }
        `,
      }),
    });

    const json = await response.json();
    expect(json.data).toEqual({"pet_by_petId": {"name": "Bob"}});
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

    const jsonText = await response.text();

    expect(jsonText).not.toEqual("{\"data\":{\"pet_by_");
  });
});
