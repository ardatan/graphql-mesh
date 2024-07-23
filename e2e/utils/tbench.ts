import { setTimeout } from 'timers/promises';
import { spawn, Thread, Worker } from 'threads';
import { getLeftoverStack } from './leftoverStack';
import { timeout as jestTimeout, type Server } from './tenv';
import type { benchGraphQLServer } from './workers/benchGraphQLServer';

export interface TbenchSustainOptions {
  /** The server process to benchmark. */
  server: Server;
  /**
   * How long should the benchmark run for.
   * @default jest.timeout - 10 seconds
   */
  duration?: number;
  /**
   * How many parallel requests should each VU perform.
   * @default 10
   */
  parallelRequestsPerVU?: number;
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
  sustain(opts: TbenchSustainOptions): Promise<TbenchResult>;
}

/**
 * @param vusCount VUs (Virtual Users) to sustain. Is actually the count of threads making parallel requests.
 */
export async function createTbench(vusCount: number): Promise<Tbench> {
  const vus = await Promise.all(
    Array(vusCount)
      .fill(null)
      .map(() => spawn<typeof benchGraphQLServer>(new Worker('./workers/benchGraphQLServer.js'))),
  );
  vus.forEach(worker => {
    getLeftoverStack().defer(() => Thread.terminate(worker));
  });
  return {
    async sustain({ server, duration = jestTimeout - 10_000, parallelRequestsPerVU = 10, params }) {
      let maxCpu = 0;
      let maxMem = 0;
      const signal = AbortSignal.timeout(duration);
      (async () => {
        while (!signal.aborted) {
          const { cpu, mem } = await server.getStats();
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
        vus.map(benchGraphQLServer =>
          benchGraphQLServer(server.port, duration, parallelRequestsPerVU, params),
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
