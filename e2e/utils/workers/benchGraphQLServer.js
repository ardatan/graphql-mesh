// @ts-check

import { expose } from 'threads/worker';

/**
 * @param {number} port Port of the server to benchmark.
 * @param {number} duration How long in milliseconds should the GraphQL requests be consistantly performed for.
 * @param {number} parallelCount How many parallel GraphQL requests should be made.
 * @param {Record<string, unknown>} params The GraphQL request params.
 *
 * @returns {Promise<number>} The slowest request's duration in milliseconds.
 */
export async function benchGraphQLServer(port, duration, parallelCount, params) {
  let slowestRequest = 0;
  const signal = AbortSignal.timeout(duration);
  while (!signal.aborted) {
    await Promise.all(
      Array(parallelCount).fill(
        (async () => {
          const start = Date.now();
          const res = await fetch(`http://0.0.0.0:${port}/graphql`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              accept: 'application/graphql-response+json, application/json',
            },
            body: JSON.stringify(params),
          });
          if (!res.ok) {
            const err = new Error(`${res.status} ${res.statusText}\n${await res.text()}`);
            err.name = 'ResponseError';
            throw err;
          }
          const result = await res.json();
          if (result.errors?.length) {
            throw new Error(`GraphQL result has errors\n${JSON.stringify(result.errors)}`);
          }
          const duration = Date.now() - start;
          if (duration > slowestRequest) {
            slowestRequest = duration;
          }
        })(),
      ),
    );
  }
  return slowestRequest;
}

expose(benchGraphQLServer);