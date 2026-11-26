import { GraphQLError } from 'graphql';
import { inspect, type ExecutionResult } from '@graphql-tools/utils';
import { Repeater } from '@repeaterjs/repeater';
import { createResultForAbort } from './utils.js';

export function isReadableStream(value: any): value is ReadableStream {
  return value && typeof value.getReader === 'function';
}

/**
 * Normalize SSE text to LF newlines while keeping a trailing CR pending when the
 * next chunk may start with LF (CRLF split across chunks).
 */
function appendSSEText(state: { currChunk: string; pendingCR: boolean }, text: string): void {
  let chunk = text;
  if (state.pendingCR) {
    chunk = '\r' + chunk;
    state.pendingCR = false;
  }
  if (chunk.endsWith('\r')) {
    state.pendingCR = true;
    chunk = chunk.slice(0, -1);
  }
  state.currChunk += chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function parseSSEMessage(msg: string): { dataStr: string; event?: string } {
  const lines = msg.split('\n');
  const dataLines: string[] = [];
  let event: string | undefined;
  for (const line of lines) {
    // Comment lines start with ':' — ignore them (e.g. ": event: complete")
    if (line.startsWith(':') || line.length === 0) {
      continue;
    }
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }
  return { dataStr: dataLines.join('\n'), event };
}

export function handleEventStreamResponse(
  response: Response,
  subscriptionCtrl?: AbortController,
  signal?: AbortSignal,
) {
  // node-fetch returns body as a promise so we need to resolve it
  const body = response.body;
  if (!isReadableStream(body)) {
    throw new Error('Response body is expected to be a readable stream but got; ' + inspect(body));
  }

  return new Repeater<ExecutionResult>((push, stop) => {
    // Use the platform TextDecoder so `{ stream: true }` preserves split multibyte chars.
    // The @whatwg-node/fetch ponyfill ignores the stream option.
    const decoder = new globalThis.TextDecoder('utf-8');

    const reader = body.getReader();

    // Abort must wake a pending reader.read() via reader.cancel() (WHATWG).
    // Calling stream.cancel() while locked is invalid; only this reader may cancel.
    const onAbort = () => {
      reader.cancel(signal?.reason).catch(() => {});
    };
    if (signal) {
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener('abort', onAbort, { once: true });
      }
    }

    stop
      .then(() => {
        signal?.removeEventListener('abort', onAbort);
        subscriptionCtrl?.abort();
        if (body.locked) {
          // cancel, not releaseLock: releasing the lock detaches the reader but
          // leaves the response body un-cancelled, so the underlying connection
          // is never released and the socket leaks until the process exits
          reader.cancel().catch(() => {});
        }
      })
      .catch(err => {
        signal?.removeEventListener('abort', onAbort);
        reader.cancel(err);
      });

    const state = { currChunk: '', pendingCR: false };

    async function processFrames(): Promise<boolean> {
      for (;;) {
        const delimIndex = state.currChunk.indexOf('\n\n');
        if (delimIndex === -1) {
          return false;
        }

        const msg = state.currChunk.slice(0, delimIndex);
        state.currChunk = state.currChunk.slice(delimIndex + 2);

        const { dataStr, event } = parseSSEMessage(msg);
        if (dataStr) {
          const data = JSON.parse(dataStr);
          await push(data.payload || data);
        }

        if (event === 'complete') {
          return true;
        }
      }
    }

    async function pump() {
      if (signal?.aborted) {
        await push(createResultForAbort(signal.reason));
        return stop();
      }
      if (!body?.locked) {
        return stop();
      }
      let done: boolean, chunk: Uint8Array<ArrayBufferLike> | undefined;
      try {
        const result = await reader.read();
        done = result.done;
        chunk = result.value;
      } catch (err) {
        if (signal?.aborted) {
          await push(createResultForAbort(signal.reason));
          return stop();
        }
        const errErr = err instanceof Error ? err : new Error(String(err));
        await push({
          errors: [new GraphQLError(errErr.message, { originalError: errErr })],
        });
        return stop();
      }
      // reader.cancel() (e.g. from AbortSignal above) fulfills pending read() as
      // { done: true }. Prefer the abort error over a silent end when the client
      // cancelled the operation.
      if (signal?.aborted) {
        await push(createResultForAbort(signal.reason));
        return stop();
      }
      if (done) {
        // Flush decoder state and any pending CR, then drain remaining frames.
        if (state.pendingCR) {
          state.currChunk += '\n';
          state.pendingCR = false;
        }
        const flushed = decoder.decode();
        if (flushed) {
          appendSSEText(state, flushed);
        }
        await processFrames();
        return stop();
      }

      if (typeof chunk === 'string') {
        appendSSEText(state, chunk);
      } else if (chunk) {
        appendSSEText(state, decoder.decode(chunk, { stream: true }));
      }

      if (await processFrames()) {
        return stop();
      }

      // Do not short-circuit on reader.closed: the next reader.read() must
      // distinguish clean EOF from a mid-stream read failure.
      return pump();
    }

    return pump();
  });
}
