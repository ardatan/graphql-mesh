/// <reference types="@cloudflare/workers-types" />
import type { KeyValueCache, Logger } from '@graphql-mesh/types';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export default class CFWorkerKVCache implements KeyValueCache {
  private kvNamespace?: KVNamespace;
  constructor(config: { namespace: string | KVNamespace; logger?: Logger }) {
    if (typeof config.namespace === 'string') {
      this.kvNamespace = globalThis[config.namespace];
    } else {
      this.kvNamespace = config.namespace;
    }
    if (this.kvNamespace === undefined) {
      // We don't use mocks because they increase the bundle size.
      config.logger?.warn(`Make sure KV Namespace: ${config.namespace} exists.`);
    }
  }

  get<T>(key: string): Promise<T | undefined> {
    return this.kvNamespace?.get(key, 'json');
  }

  getKeysByPrefix(prefix: string) {
    return handleMaybePromise(
      () => this.kvNamespace?.list({ prefix }),
      result => {
        if (!result) {
          return [];
        }

        return result.keys.map(keyEntry => keyEntry.name);
      },
    );
  }

  set(key: string, value: any, options?: { ttl?: number }): Promise<void> {
    return this.kvNamespace?.put(key, JSON.stringify(value), {
      expirationTtl: options?.ttl,
    });
  }

  delete(key: string) {
    return handleMaybePromise(
      () => this.kvNamespace?.delete(key),
      () => true,
      () => false,
    );
  }
}
