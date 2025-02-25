import LocalForage from 'localforage';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import type {
  KeyValueCache,
  KeyValueCacheSetOptions,
  MeshPubSub,
  YamlConfig,
} from '@graphql-mesh/types';

export default class LocalforageCache<V = any> implements KeyValueCache<V> {
  private localforage: LocalForage;
  constructor(config?: YamlConfig.LocalforageConfig & { pubsub?: MeshPubSub }) {
    const driverNames = config?.driver || ['INDEXEDDB', 'WEBSQL', 'LOCALSTORAGE'];
    if (driverNames.every(driverName => !LocalForage.supports(driverName))) {
      return new InMemoryLRUCache({ pubsub: config?.pubsub }) as any;
    }
    this.localforage = LocalForage.createInstance({
      name: config?.name || 'graphql-mesh-cache',
      storeName: config?.storeName || 'graphql-mesh-cache-store',
      driver: driverNames.map(driverName => LocalForage[driverName] ?? driverName),
      size: config?.size,
      version: config?.version,
      description: config?.description,
    });
  }

  get(key: string) {
    const getItem = () => this.localforage.getItem<V>(key.toString());
    return this.localforage.getItem<number>(`${key}.expiresAt`).then(expiresAt => {
      if (expiresAt && Date.now() > expiresAt) {
        return this.localforage.removeItem(key).then(() => getItem());
      }
      return getItem();
    });
  }

  getKeysByPrefix(prefix: string) {
    return this.localforage.keys().then(keys => keys.filter(key => key.startsWith(prefix)));
  }

  set(key: string, value: V, options?: KeyValueCacheSetOptions) {
    const jobs: Promise<any>[] = [this.localforage.setItem<V>(key, value)];
    if (options?.ttl) {
      jobs.push(this.localforage.setItem(`${key}.expiresAt`, Date.now() + options.ttl * 1000));
    }
    return Promise.all(jobs).then(() => undefined);
  }

  delete(key: string) {
    return this.localforage.removeItem(key).then(
      () => true,
      () => false,
    );
  }
}
