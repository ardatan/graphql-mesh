import { KeyValueCache, Logger } from '@graphql-mesh/types';
import { KVNamespace } from '@cloudflare/workers-types';

export default class CFWorkerKVCache implements KeyValueCache {
  private kvNamespace?: KVNamespace;
  constructor(config: { namespace: string; logger: Logger }) {
    this.kvNamespace = globalThis[config.namespace];
    if (this.kvNamespace === undefined) {
      // We don't use mocks because they increase the bundle size.
      config.logger.warn(`Make sure KV Namespace: ${config.namespace} exists.`);
    }
  }

  get<T>(key: string): Promise<T | undefined> {
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

  set(key: string, value: any, options?: { ttl?: number }): Promise<void> {
    return this.kvNamespace?.put(key, JSON.stringify(value), {
      expirationTtl: options?.ttl,
    });
  }

  delete(key: string): Promise<void> {
    return this.kvNamespace?.delete(key);
  }
}
