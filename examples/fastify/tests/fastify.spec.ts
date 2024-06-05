import { AddressInfo } from 'net';
import { fetch } from '@whatwg-node/fetch';
import { app } from '../src/app';
import { upstream } from '../src/upstream';

describe('fastify', () => {
  beforeAll(() => Promise.all([app.listen(), upstream.listen()]));

  afterAll(() => Promise.all([app.close(), upstream.close()]));

  it('should work', async () => {
    const upstreamPort = (upstream.server.address() as AddressInfo).port;
    const response = await fetch(
      `http://localhost:${(app.server.address() as AddressInfo).port}/graphql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-upstream-port': upstreamPort.toString(),
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
      },
    );

    const json = await response.json();
    expect(json).toMatchObject({
      data: {
        pet_by_petId: {
          name: 'Bob',
        },
      },
    });
  });

  it.skip('should work too', async () => {
    const upstreamPort = (upstream.server.address() as AddressInfo).port;
    const response = await fetch(
      `http://localhost:${(app.server.address() as AddressInfo).port}/graphql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-upstream-port': upstreamPort.toString(),
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
      },
    );

    const resJson = await response.json();

    expect(resJson).toEqual({
      data: { pet_by_petId: null },
      errors: [
        {
          message: 'Upstream HTTP Error: 500, Could not invoke operation GET /pet/{args.petId}',
          path: ['pet_by_petId'],
          extensions: {
            request: { endpoint: `http://localhost:${upstreamPort}/pet/pet500`, method: 'GET' },
            responseBody: { error: 'Error' },
          },
        },
      ],
    });
  });
});
