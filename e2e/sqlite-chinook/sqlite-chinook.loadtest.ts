import os from 'os';
import { createTbench, type Tbench, type TbenchResult } from '@e2e/tbench';
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
  maxMem: 500, // MB
  slowestRequest: 1.5, // second
};

it(`should perform within threshold ${JSON.stringify(threshold)}`, async () => {
  const { output } = await compose({ output: 'graphql' });
  const server = await serve({ supergraph: output });
  const result = await tbench.sustain({
    server,
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

  console.debug(result);

  expect(result.maxCpu).toBeLessThan(threshold.maxCpu);
  expect(result.maxMem).toBeLessThan(threshold.maxMem);
  expect(result.slowestRequest).toBeLessThan(threshold.slowestRequest);
});
