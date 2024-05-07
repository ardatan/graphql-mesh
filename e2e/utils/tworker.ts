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
  /**
   * Executes the provided GraphQL operation through an
   * HTTP request on the local server at the port requiring
   * no response or GraphQL result errors.
   */
  mustExecute(
    port: number,
    args: {
      query: string;
      variables?: Record<string, unknown>;
      operationName?: string;
    },
  ): Promise<ExecutionResult<any>>;
}

export async function createTworker(): Promise<Tworker> {
  const worker_mustExecute = await spawn(new Worker('./workers/mustExecute.js'));
  leftovers.add(worker_mustExecute);
  return {
    mustExecute: worker_mustExecute,
  };
}
