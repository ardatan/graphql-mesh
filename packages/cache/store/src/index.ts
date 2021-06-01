import { KeyValueCache, KeyValueCacheSetOptions } from '@graphql-mesh/types';
import { MeshStore, PredefinedProxyOptions } from '@graphql-mesh/store';

type StoreEntry<V> = { expiresAt: number; value: V };

export default class StoreCache<V = any> implements KeyValueCache<V> {
  private store: MeshStore;
  constructor({ store }: { store: MeshStore }) {
    this.store = store;
  }

  private getProxy(name: string) {
    return this.store.proxy<StoreEntry<V>>(name, PredefinedProxyOptions.JsonWithoutValidation);
  }

  async get(name: string) {
    const proxy = this.getProxy(name);
    const entry = await proxy.get();
    if (entry?.expiresAt && Date.now() > entry.expiresAt) {
      await proxy.delete();
      return undefined;
    }
    return entry?.value;
  }

  set(name: string, value: V, options: KeyValueCacheSetOptions) {
    const proxy = this.getProxy(name);
    return proxy.set({
      expiresAt: options?.ttl ? Date.now() + options.ttl * 1000 : Infinity,
      value,
    });
  }

  async delete(name: string) {
    const proxy = this.getProxy(name);
    return proxy.delete();
  }
}
