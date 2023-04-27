import { fetch } from '@whatwg-node/fetch';
import { app } from '../src/app';

describe('fastify', () => {
  beforeAll(async () => {
    await app.listen({
      port: 4000,
    });
  });
  afterAll(async () => {
    await app.close();
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
            allFilms {
              films {
                id
                title
              }
            }
          }
        `,
      }),
    });

    const json = await response.json();
    expect(json.data.allFilms.films.length).toBeGreaterThan(0);
  });
});
