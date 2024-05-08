import { setTimeout } from 'timers/promises';
import { spawn, Thread, Worker } from 'threads';
import { Serve } from './tenv';
import type { benchGraphQLServer } from './workers/benchGraphQLServer';

const leftovers = new Set<Thread>();
afterAll(async () => {
  await Promise.allSettled(
    Array.from(leftovers.values()).map(leftover => Thread.terminate(leftover)),
  ).finally(() => {
    leftovers.clear();
  });
});

export interface ServeSustainOptions {
  /** The serve process to benchmark. */
  serve: Serve;
  /** How long should the benchmark run for. */
  duration: number;
  /** How many parallel requests should each VU perform. */
  parallelRequestsPerVU: number;
  /** GraphQL parameters to use. */
  params: {
    query: string;
    variables?: Record<string, unknown>;
    operationName?: string;
  };
}

export interface TbenchResult {
  /** Maximum CPU utilization. */
  maxCpu: number;
  /** Maximum memory utilization in megabytes (MB). */
  maxMem: number;
  /**
   * The duration of the slowest request in seconds
   * across all VUs.
   */
  slowestRequest: number;
}

export interface Tbench {
  serveSustain(opts: ServeSustainOptions): Promise<TbenchResult>;
}

/**
 * @param vus VUS (Virtual USers) to sustain. Is actually the count of threads making parallel requests.
 */
export async function createTbench(vus: number): Promise<Tbench> {
  const workers = await Promise.all(
    Array(vus)
      .fill(null)
      .map(() => spawn<typeof benchGraphQLServer>(new Worker('./workers/benchGraphQLServer.js'))),
  );
  workers.forEach(worker => leftovers.add(worker));
  return {
    async serveSustain({ serve, duration, parallelRequestsPerVU, params }) {
      let maxCpu = 0;
      let maxMem = 0;
      const signal = AbortSignal.timeout(duration);
      (async () => {
        while (!signal.aborted) {
          const { cpu, mem } = await serve.getStats();
          if (maxCpu < cpu) {
            maxCpu = cpu;
          }
          if (maxMem < mem) {
            maxMem = mem;
          }
          await setTimeout(300);
        }
      })();

      let slowestRequest = 0;
      for (const slowestRequestInVU of await Promise.all(
        workers.map(benchGraphQLServer =>
          benchGraphQLServer(serve.port, duration, parallelRequestsPerVU, params),
        ),
      )) {
        if (slowestRequestInVU > slowestRequest) {
          slowestRequest = slowestRequestInVU;
        }
      }

      return {
        maxCpu,
        maxMem,
        slowestRequest: slowestRequest * 0.001, // ms to s
      };
    },
  };
}
