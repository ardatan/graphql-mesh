import { ImportFn, KeyValueCache, KeyValueCacheSetOptions, YamlConfig } from '@graphql-mesh/types';
import { createLruCache, defaultImportFn } from '@graphql-mesh/utils';

export default class LocalforageCache<V = any> implements KeyValueCache<V> {
  private localforage$: Promise<typeof import('localforage')>;
  constructor(config?: YamlConfig.LocalforageConfig & { importFn: ImportFn }) {
    if (!globalThis.localStorage) {
      const storage = createLruCache();
      globalThis.localStorage = {
        get length() {
          return storage.size;
        },
        clear: () => storage.clear(),
        getItem: key => storage.get(key),
        key: index => storage.keys()[index],
        removeItem: key => storage.delete(key),
        setItem: (key, value) => storage.set(key, value),
      };
    }
    const importFn = config?.importFn ?? defaultImportFn;
    this.localforage$ = importFn('localforage')
      .then(localforage => localforage.default || localforage)
      .then(localforage => {
        const driverNames = config?.driver || ['INDEXEDDB', 'WEBSQL', 'LOCALSTORAGE'];
        const runtimeConfig = {
          ...config,
          driver: driverNames.map(driverName => localforage[driverName]),
        };
        localforage.config(runtimeConfig);
        return localforage;
      });
  }

  async get(key: string) {
    const localforage = await this.localforage$;
    const expiresAt = await localforage.getItem<number>(`${key}.expiresAt`);
    if (expiresAt && Date.now() > expiresAt) {
      await localforage.removeItem(key);
    }
    return localforage.getItem<V>(key.toString());
  }

  async set(key: string, value: V, options?: KeyValueCacheSetOptions) {
    const localforage = await this.localforage$;
    const jobs: Promise<any>[] = [localforage.setItem<V>(key, value)];
    if (options?.ttl) {
      jobs.push(localforage.setItem(`${key}.expiresAt`, Date.now() + options.ttl * 1000));
    }
    await Promise.all(jobs);
  }

  async delete(key: string) {
    const localforage = await this.localforage$;
    return localforage.removeItem(key);
  }
}
