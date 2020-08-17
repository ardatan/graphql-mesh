import localforage from 'localforage';
import { KeyValueCache, KeyValueCacheSetOptions, YamlConfig } from '@graphql-mesh/types';

export default class LocalforageCache<V = string> implements KeyValueCache<V> {
  constructor(config: YamlConfig.LocalforageConfig) {
    const runtimeConfig = {
      ...config,
      driver: [
        ...config.driver?.map(driverName => localforage[driverName]),
        localforage.INDEXEDDB,
        localforage.WEBSQL,
        localforage.LOCALSTORAGE,
      ],
    };
    localforage.config(runtimeConfig);
  }

  async get(key: string) {
    const expiresAt = await localforage.getItem<number>(`${key}.expiresAt`);
    if (expiresAt && Date.now() > expiresAt) {
      await localforage.removeItem(key);
    }
    return localforage.getItem<V>(key.toString());
  }

  async set(key: string, value: V, options?: KeyValueCacheSetOptions) {
    const jobs: Promise<any>[] = [localforage.setItem<V>(key, value)];
    if (options?.ttl) {
      jobs.push(localforage.setItem(`${key}.expiresAt`, Date.now() + options.ttl * 1000));
    }
    await Promise.all(jobs);
  }

  delete(key: string) {
    return localforage.removeItem(key);
  }
}
