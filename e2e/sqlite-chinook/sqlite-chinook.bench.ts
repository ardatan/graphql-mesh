import os from 'os';
import { setTimeout } from 'timers/promises';
import { createTenv } from '@e2e/tenv';
import { createTworker, Tworker } from '@e2e/tworker';

const { serve, compose } = createTenv(__dirname);

const tworkers: Tworker[] = [];
beforeAll(async () => {
  for (let i = 0; i < os.availableParallelism(); i++) {
    tworkers.push(await createTworker());
  }
});

it('should not consume more than 250MB of memory', async () => {
  const { output } = await compose({ output: 'graphql' });
  const { port, getStats } = await serve({ fusiongraph: output });

  const duration = AbortSignal.timeout(1_000);

  const runner = (async () => {
    for (;;) {
      if (duration.aborted) {
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

  let highCpu = 0;
  let highMem = 0;
  (async () => {
    for (;;) {
      await setTimeout(300);
      if (duration.aborted) {
        return; // done
      }
      const { cpu, mem } = await getStats();
      if (highCpu < cpu) {
        highCpu = cpu;
      }
      if (highMem < mem) {
        highMem = mem;
      }
    }
  })();

  await runner;

  expect(highMem).toBeLessThan(250);
});
