import localforage from 'localforage';
import { KeyValueCache, KeyValueCacheSetOptions, YamlConfig } from '@graphql-mesh/types';

export default class LocalforageCache<V = string> implements KeyValueCache<V> {
  constructor(config: YamlConfig.LocalforageConfig) {
    const runtimeConfig = {
      ...config,
      driver: localforage[config.driver],
    };
    localforage.config(runtimeConfig);
  }

  get(key: string) {
    return localforage.getItem<V>(key.toString());
  }

  async set(key: string, value: V, options?: KeyValueCacheSetOptions) {
    await localforage.setItem<V>(key, value);
    if (options?.ttl) {
      setTimeout(() => this.delete(key), options.ttl * 1000);
    }
  }

  async delete(key: string) {
    await localforage.removeItem(key);
  }
}
