import { handleEventStreamResponse } from '../src/handleEventStreamResponse.js';

function sseResponse(chunks: Array<string | Uint8Array>): Response {
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      const chunk = chunks[index++];
      controller.enqueue(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk);
    },
  });
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream' },
  });
}

async function collect(iterable: AsyncIterable<any>) {
  const values: any[] = [];
  for await (const value of iterable) {
    values.push(value);
  }
  return values;
}

describe('handleEventStreamResponse', () => {
  it('parses CRLF-delimited SSE frames', async () => {
    const response = sseResponse([
      'data: {"data":{"ok":true}}\r\n\r\n',
      'event: complete\r\ndata:\r\n\r\n',
    ]);
    const values = await collect(handleEventStreamResponse(response));
    expect(values).toEqual([{ data: { ok: true } }]);
  });

  it('ignores comment lines that look like event fields', async () => {
    const response = sseResponse([
      'data: {"data":{"n":1}}\n\n',
      ': event: complete\n\n',
      'data: {"data":{"n":2}}\n\n',
      'event: complete\ndata:\n\n',
    ]);
    const values = await collect(handleEventStreamResponse(response));
    expect(values).toEqual([{ data: { n: 1 } }, { data: { n: 2 } }]);
  });

  it('preserves multibyte UTF-8 characters split across chunks', async () => {
    const payload = JSON.stringify({ data: { char: 'é' } });
    const encoded = new TextEncoder().encode(`data: ${payload}\n\n`);
    // Split inside the multibyte character for é (C3 A9)
    const splitAt = encoded.indexOf(0xc3) + 1;
    expect(encoded[splitAt - 1]).toBe(0xc3);
    const response = sseResponse([encoded.slice(0, splitAt), encoded.slice(splitAt)]);
    const values = await collect(handleEventStreamResponse(response));
    expect(values).toEqual([{ data: { char: 'é' } }]);
  });

  it('propagates read failures between results', async () => {
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++;
        if (pulled === 1) {
          controller.enqueue(new TextEncoder().encode('data: {"data":{"n":1}}\n\n'));
          return;
        }
        controller.error(new Error('boom'));
      },
    });
    const response = new Response(stream, {
      headers: { 'content-type': 'text/event-stream' },
    });
    const values = await collect(handleEventStreamResponse(response));
    expect(values[0]).toEqual({ data: { n: 1 } });
    expect(values[1]?.errors?.[0]?.message).toContain('boom');
  });
});
