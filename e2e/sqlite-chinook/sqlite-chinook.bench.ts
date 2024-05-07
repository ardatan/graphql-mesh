import { createTenv } from '@e2e/tenv';
import { createTworker, Tworker } from '@e2e/tworker';

const { serve, compose } = createTenv(__dirname);

let tworker: Tworker;
beforeAll(async () => {
  tworker = await createTworker();
});

it('should not consume a lot of memory', async () => {
  const { output } = await compose({ output: 'graphql' });
  const { port } = await serve({ fusiongraph: output });

  const result = await tworker.execute(port, {
    query: /* GraphQL */ `
      query Albums {
        albums(limit: 2) {
          albumId
          title
          artist {
            name
          }
        }
      }
    `,
  });

  expect(result.errors).toBeUndefined();
});
