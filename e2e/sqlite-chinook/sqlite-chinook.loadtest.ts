import os from 'os';
import { createTbench, Tbench, TbenchResult } from '@e2e/tbench';
import { createTenv } from '@e2e/tenv';

const { serve, compose } = createTenv(__dirname);

let tbench: Tbench;
beforeAll(async () => {
  tbench = await createTbench(
    // to give space for jest and the serve process.
    os.availableParallelism() - 2,
  );
});

const threshold: TbenchResult = {
  maxCpu: Infinity, // we dont care
  maxMem: 300, // MB
  slowestRequest: 0.5, // seconds
};

it(`should perform within threshold ${JSON.stringify(threshold)}`, async () => {
  const { output } = await compose({ output: 'graphql' });

  const { maxCpu, maxMem, slowestRequest } = await tbench.serveSustain({
    serve: await serve({ fusiongraph: output }),
    params: {
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
    },
  });

  expect(maxCpu).toBeLessThan(threshold.maxCpu);
  expect(maxMem).toBeLessThan(threshold.maxMem);
  expect(slowestRequest).toBeLessThan(threshold.slowestRequest);
});
