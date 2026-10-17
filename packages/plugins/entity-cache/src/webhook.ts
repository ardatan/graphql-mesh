import type { GatewayPlugin } from '@graphql-hive/gateway-runtime';
import { EntityInvalidationInputError, validateEntityInvalidation } from './events.js';
import type { EntityInvalidation } from './types.js';

// #9658: transport/authentication are adapters, never assumptions in the entity cache core.
export function createEntityInvalidationWebhook({
  invalidate,
  authenticate,
  path = '/internal/entity-invalidate',
  maxBytes = 64 * 1024,
}: {
  invalidate(input: EntityInvalidation): Promise<void>;
  /** #9658: body-reading authenticators must consume request.clone(), preserving the original. */
  authenticate(request: Request): boolean | Promise<boolean>;
  path?: string;
  maxBytes?: number;
}): GatewayPlugin {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 64 * 1024)
    throw new Error('invalid entity webhook body limit');
  return {
    async onRequest({ request, endResponse, fetchAPI }) {
      if (new URL(request.url).pathname !== path) return;
      const reply = (status: number) => endResponse(new fetchAPI.Response(null, { status }));
      try {
        if (!(await authenticate(request))) {
          reply(401);
          return;
        }
      } catch {
        // #9658: credential service failures never expose exception details or accept the event.
        reply(503);
        return;
      }
      if (request.method !== 'POST') {
        reply(405);
        return;
      }
      if (Number(request.headers.get('content-length')) > maxBytes) {
        reply(413);
        return;
      }
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      try {
        // #9658: consumed or locked original bodies follow the fixed invalid-input response.
        reader = request.body?.getReader();
      } catch {
        reply(400);
        return;
      }
      if (!reader) {
        reply(400);
        return;
      }
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      try {
        let next = await reader.read();
        while (!next.done) {
          const value = next.value;
          bytes += value.length;
          if (bytes > maxBytes) {
            await reader.cancel();
            reply(413);
            return;
          }
          chunks.push(value);
          next = await reader.read();
        }
      } catch {
        reply(400);
        return;
      }
      let payload: EntityInvalidation & { v: number };
      try {
        const buffer = new Uint8Array(bytes);
        let offset = 0;
        for (const chunk of chunks) {
          buffer.set(chunk, offset);
          offset += chunk.length;
        }
        payload = JSON.parse(new TextDecoder().decode(buffer));
        if (!payload || payload.v !== 1 || !Array.isArray(payload.identities) || !payload.event)
          throw new EntityInvalidationInputError('invalid payload');
        validateEntityInvalidation(payload);
      } catch {
        reply(400);
        return;
      }
      try {
        await invalidate(payload);
        reply(204);
      } catch (error) {
        reply(error instanceof EntityInvalidationInputError ? 400 : 503);
      }
    },
  };
}
