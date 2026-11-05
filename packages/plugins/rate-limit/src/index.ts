import { Store, useRateLimiter, type Identity } from '@envelop/rate-limiter';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { KeyValueCache, MeshPlugin, YamlConfig } from '@graphql-mesh/types';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

class RateLimitMeshStore extends Store {
  constructor(private cache: KeyValueCache) {
    super();
  }

  getForIdentity(identity: Identity): Promise<number[]> | number[] {
    return handleMaybePromise(
      () => this.cache.get(`rate-limit:${identity.contextIdentity}:${identity.fieldIdentity}`),
      value => value || [],
    );
  }

  setForIdentity(identity: Identity, timestamps: number[], windowMs: number) {
    return this.cache.set(
      `rate-limit:${identity.contextIdentity}:${identity.fieldIdentity}`,
      timestamps,
      { ttl: windowMs / 1000 },
    ) as Promise<void>;
  }
}

export default function useMeshRateLimit({
  config,
  cache,
}: YamlConfig.RateLimitPluginConfig & {
  cache: KeyValueCache;
}): MeshPlugin<any> {
  return useRateLimiter({
    identifyFn: (context: any) =>
      context.headers?.authorization ||
      context.req?.socket?.remoteAddress ||
      context.req?.connection?.remoteAddress ||
      context.req?.ip ||
      context.headers?.['x-forwarded-for'] ||
      context.headers?.host ||
      'unknown',
    store: new RateLimitMeshStore(cache),
    interpolateMessage: (message, identifier, params) =>
      stringInterpolator.parse(message, {
        ...params,
        id: identifier,
        identifier,
      }),
    configByField: config.map(origConfig => ({
      type: origConfig.type,
      field: origConfig.field,
      max: origConfig.max,
      window: `${origConfig.ttl}ms`,
      message: `Rate limit of "${origConfig.type}.${origConfig.field}" exceeded for "{id}"`,
      identifyFn: origConfig.identifier
        ? (context: any) =>
            stringInterpolator.parse(origConfig.identifier, {
              context,
              env: process.env,
            })
        : undefined,
    })),
  });
}
