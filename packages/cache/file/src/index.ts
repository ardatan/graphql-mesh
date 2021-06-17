import { KeyValueCache } from '@graphql-mesh/types';
import { isAbsolute, join } from 'path';
import { get, set } from 'lodash';
import DataLoader from 'dataloader';
import { writeJSON } from '@graphql-mesh/utils';

export default class FileCache<V = any> implements KeyValueCache<V> {
  json$: Promise<Record<string, V>>;
  absolutePath: string;
  writeDataLoader: DataLoader<any, any>;
  constructor({ path }: { path: string }) {
    this.json$ = import(this.absolutePath).then(m => m.default || m);
    this.absolutePath = isAbsolute(path) ? path : join(process.cwd(), path);
    this.writeDataLoader = new DataLoader(async keys => {
      const json = await this.json$;
      await writeJSON(this.absolutePath, json);
      return keys;
    });
  }

  async get(name: string) {
    const json = await this.json$;
    return get(json, name);
  }

  async set(name: string, value: V) {
    const json = await this.json$;
    set(json, name, value);
    this.writeDataLoader.load({});
  }

  async delete(name: string) {
    this.set(name, undefined);
  }
}
