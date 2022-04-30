import { KeyValueCache, KeyValueCacheSetOptions, YamlConfig } from '@graphql-mesh/types';
import { createInMemoryLRUDriver } from './InMemoryLRUDriver';
import LocalForage from 'localforage';

let INMEMORY_LRU_DEFINITION$: Promise<void>;

export default class LocalforageCache<V = any> implements KeyValueCache<V> {
  private localforage: LocalForage;
  constructor(config?: YamlConfig.LocalforageConfig) {
    const driverNames = config?.driver || ['INDEXEDDB', 'WEBSQL', 'LOCALSTORAGE', 'INMEMORY_LRU'];
    if (INMEMORY_LRU_DEFINITION$ == null) {
      INMEMORY_LRU_DEFINITION$ = LocalForage.defineDriver(createInMemoryLRUDriver());
    }
    this.ready$ = INMEMORY_LRU_DEFINITION$.then(() => {
      this.localforage = LocalForage.createInstance({
        name: config?.name,
        storeName: config?.storeName,
        driver: driverNames.map(driverName => LocalForage[driverName] ?? driverName),
      });
    });
    if (config?.cleanOnStart) {
      this.ready$ = this.ready$.then(() => this.localforage.clear());
    }
  }

  private ready$: Promise<void>;

  async get(key: string) {
    await this.ready$;
    const expiresAt = await this.localforage.getItem<number>(`${key}.expiresAt`);
    if (expiresAt && Date.now() > expiresAt) {
      await this.localforage.removeItem(key);
    }
    return this.localforage.getItem<V>(key.toString());
  }

  async set(key: string, value: V, options?: KeyValueCacheSetOptions) {
    await this.ready$;
    const jobs: Promise<any>[] = [this.localforage.setItem<V>(key, value)];
    if (options?.ttl) {
      jobs.push(this.localforage.setItem(`${key}.expiresAt`, Date.now() + options.ttl * 1000));
    }
    await Promise.all(jobs);
  }

  async delete(key: string) {
    await this.ready$;
    return this.localforage.removeItem(key);
  }
}
