import { KeyValueCache } from '@graphql-mesh/types';
import { isAbsolute, join } from 'path';
import DataLoader from 'dataloader';
import { readJSON, writeJSON, pathExists } from '@graphql-mesh/utils';

export default class FileCache<V = any> implements KeyValueCache<V> {
  json$: Promise<Record<string, V>>;
  writeDataLoader: DataLoader<any, any>;
  constructor({ path }: { path: string }) {
    const absolutePath = isAbsolute(path) ? path : join(process.cwd(), path);
    this.json$ = pathExists(path).then(isExists => (isExists ? readJSON(absolutePath) : {}));
    this.writeDataLoader = new DataLoader(async keys => {
      this.json$.then(json => writeJSON(absolutePath, json));
      return keys;
    });
  }

  get(name: string) {
    return this.json$.then(json => json[name]);
  }

  async set(name: string, value: V) {
    this.json$.then(json => (json[name] = value));
    this.writeDataLoader.load({});
  }

  async delete(name: string) {
    this.json$.then(json => (json[name] = undefined));
  }
}
