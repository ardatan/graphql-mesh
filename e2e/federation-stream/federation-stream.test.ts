import type { ExecutionResult } from 'graphql';
import { meros } from 'meros/browser';
import { createTenv } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';

/** Port of Hive Gateway `e2e/federation-stream`. */
const { serve, service, composeWithApollo } = createTenv(__dirname);

it('streams a [String!]! scalar list via @stream over a federated subgraph', async () => {
  const alphabetSvc = await service('alphabet');
  const { output } = await composeWithApollo({
    services: [alphabetSvc],
  });
  const { hostname, port } = await serve({ supergraph: output });

  const res = await fetch(`http://${hostname}:${port}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'multipart/mixed',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query {
          alphabet @stream(initialCount: 1)
        }
      `,
    }),
  });

  expect(res.ok).toBe(true);
  expect(res.headers.get('content-type')).toContain('multipart/mixed');

  const parts = await meros<ExecutionResult>(res);
  if (!('next' in parts)) {
    throw new Error('Expected an async iterable of multipart parts');
  }

  const executionResult: ExecutionResult<{ alphabet: string[] }> = {
    data: { alphabet: [] },
  };

  for await (const part of parts) {
    if (!part.json) continue;
    const payload = part.body as ExecutionResult & {
      incremental?: { items?: string[]; path?: (string | number)[] }[];
      hasNext?: boolean;
    };

    if (payload.data != null) {
      Object.assign(executionResult, payload);
    }
    if (payload.incremental) {
      for (const chunk of payload.incremental) {
        if (chunk.items) {
          executionResult.data!.alphabet.push(...chunk.items);
        }
      }
    }
    if (payload.errors) {
      executionResult.errors = payload.errors;
    }
  }

  expect(executionResult.errors).toBeUndefined();
  expect(executionResult.data).toEqual({
    alphabet: ['a', 'b', 'c', 'd', 'e'],
  });
});

it('streams a nested list via @stream under a proxied object field', async () => {
  const alphabetSvc = await service('alphabet');
  const { output } = await composeWithApollo({
    services: [alphabetSvc],
  });
  const { hostname, port } = await serve({ supergraph: output });

  const res = await fetch(`http://${hostname}:${port}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'multipart/mixed',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query {
          boxedAlphabet {
            letters @stream(initialCount: 1)
          }
        }
      `,
    }),
  });

  expect(res.ok).toBe(true);
  expect(res.headers.get('content-type')).toContain('multipart/mixed');

  const parts = await meros<ExecutionResult>(res);
  if (!('next' in parts)) {
    throw new Error('Expected an async iterable of multipart parts');
  }

  const letters: string[] = [];
  for await (const part of parts) {
    if (!part.json) continue;
    const payload = part.body as ExecutionResult & {
      incremental?: { items?: string[]; path?: (string | number)[] }[];
    };

    const initial = (payload.data as { boxedAlphabet?: { letters?: string[] } } | null)
      ?.boxedAlphabet?.letters;
    if (initial) {
      letters.push(...initial);
    }
    if (payload.incremental) {
      for (const chunk of payload.incremental) {
        if (chunk.items) {
          letters.push(...chunk.items);
        }
      }
    }
    if (payload.errors) {
      throw new Error(JSON.stringify(payload.errors));
    }
  }

  expect(letters).toEqual(['a', 'b', 'c']);
});
