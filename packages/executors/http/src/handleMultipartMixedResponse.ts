import type { IncomingMessage } from 'http';
import { meros as merosReadableStream } from 'meros/browser';
import { meros as merosIncomingMessage } from 'meros/node';
import { mergeIncrementalResult, type ExecutionResult } from '@graphql-tools/utils';
import { mapAsyncIterator } from '@whatwg-node/promise-helpers';

type Part =
  | {
      body: ExecutionResult;
      json: true;
    }
  | {
      body: string | Buffer;
      json: false;
    };

function isIncomingMessage(body: any): body is IncomingMessage {
  return body != null && typeof body === 'object' && 'pipe' in body;
}

export type HandleMultipartMixedResponseOptions = {
  /**
   * When `true` (default), each multipart part is merged into a growing
   * snapshot (legacy). When `false`, each part is yielded as received - the
   * same shape the default schema executor produces.
   */
  mergeIncremental?: boolean;
};

export async function handleMultipartMixedResponse(
  response: Response,
  options?: HandleMultipartMixedResponseOptions,
) {
  const mergeIncremental = options?.mergeIncremental !== false;
  const body = response.body;
  const contentType = response.headers.get('content-type') || '';
  let asyncIterator: AsyncIterator<Part> | undefined;
  if (isIncomingMessage(body)) {
    // Meros/node expects headers as an object map with the content-type prop
    body.headers = {
      'content-type': contentType,
    };
    // And it expects `IncomingMessage` and `node-fetch` returns `body` as `Promise<PassThrough>`
    const result = await merosIncomingMessage<ExecutionResult>(body);
    if ('next' in result) {
      asyncIterator = result;
    }
  } else {
    // Nothing is needed for regular `Response`.
    const result = await merosReadableStream<ExecutionResult>(response);
    if ('next' in result) {
      asyncIterator = result;
    }
  }

  if (asyncIterator == null) {
    return {} as ExecutionResult;
  }

  if (!mergeIncremental) {
    return mapAsyncIterator(asyncIterator, (part: Part) => {
      if (part.json) {
        return part.body;
      }
      return {} as ExecutionResult;
    });
  }

  const executionResult: ExecutionResult = {};

  return mapAsyncIterator(asyncIterator, (part: Part) => {
    if (part.json) {
      const incrementalResult = part.body;
      mergeIncrementalResult({
        incrementalResult,
        executionResult,
      });
      // mergeIncrementalResult only folds data/errors - keep hasNext so
      // consumers (IncrementalReceiver, @stream) can stop without draining.
      if (incrementalResult.hasNext != null) {
        executionResult.hasNext = incrementalResult.hasNext;
      }
    }
    return executionResult;
  });
}
