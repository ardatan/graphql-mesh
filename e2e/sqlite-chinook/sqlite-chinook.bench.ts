import os from 'os';
import { createTenv } from '@e2e/tenv';
import { createTworker, Tworker } from '@e2e/tworker';

const { serve, compose } = createTenv(__dirname);

const tworkers: Tworker[] = [];
beforeAll(async () => {
  for (let i = 0; i < os.availableParallelism(); i++) {
    tworkers.push(await createTworker());
  }
});

it('should not consume a lot of memory', async () => {
  const { output } = await compose({ output: 'graphql' });
  const { port } = await serve({ fusiongraph: output });

  const timeout = AbortSignal.timeout(1_000);
  const runner = (async () => {
    for (;;) {
      if (timeout.aborted) {
        return; // done
      }
      await Promise.all(
        tworkers.map(({ mustExecute }) =>
          mustExecute(port, {
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
          }),
        ),
      );
    }
  })();

  await runner;
});
