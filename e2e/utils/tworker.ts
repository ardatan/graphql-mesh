import { ExecutionResult } from 'graphql';
import { spawn, Thread, Worker } from 'threads';

const leftovers = new Set<Thread>();
afterAll(async () => {
  await Promise.allSettled(
    Array.from(leftovers.values()).map(leftover => Thread.terminate(leftover)),
  ).finally(() => {
    leftovers.clear();
  });
});

export interface Tworker {
  execute(
    port: number,
    args: {
      query: string;
      variables?: Record<string, unknown>;
      operationName?: string;
    },
  ): Promise<ExecutionResult<any>>;
}

export async function createTworker(): Promise<Tworker> {
  const worker_execute = await spawn(new Worker('./workers/execute.js'));
  leftovers.add(worker_execute);
  return {
    execute: worker_execute,
  };
}
