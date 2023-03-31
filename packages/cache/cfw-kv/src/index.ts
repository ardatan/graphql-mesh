/// <reference types="@cloudflare/workers-types" />
import { KeyValueCache, Logger } from '@graphql-mesh/types';

export default class CFWorkerKVCache implements KeyValueCache {
  private kvNamespace?: KVNamespace;
  constructor(config: { namespace: string; logger: Logger }) {
    // @ts-expect-error - KV is in globalThis for CFW
    this.kvNamespace = globalThis[config.namespace];
    if (this.kvNamespace === undefined) {
      // We don't use mocks because they increase the bundle size.
      config.logger.warn(`Make sure KV Namespace: ${config.namespace} exists.`);
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.kvNamespace?.get(key, 'json');
  }

  async getKeysByPrefix(prefix: string): Promise<string[]> {
    const result = await this.kvNamespace?.list({
      prefix,
    });

    if (!result) {
      return [];
    }

    return result.keys.map(keyEntry => keyEntry.name);
  }

  async set(key: string, value: any, options?: { ttl?: number }): Promise<void> {
    return this.kvNamespace?.put(key, JSON.stringify(value), {
      expirationTtl: options?.ttl,
    });
  }

  async delete(key: string): Promise<void> {
    return this.kvNamespace?.delete(key);
  }
}
