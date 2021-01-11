import { KeyValueCache } from '@graphql-mesh/utils';
import { isAbsolute, join } from 'path';
import { cwd } from 'process';
import { get, set } from 'lodash';
import { readJSONSync, writeJSON, pathExistsSync } from 'fs-extra';
import DataLoader from 'dataloader';

export default class FileCache<V = string> implements KeyValueCache<V> {
  json: Record<string, V>;
  absolutePath: string;
  writeDataLoader: DataLoader<any, any>;
  constructor({ path }: { path: string }) {
    this.absolutePath = isAbsolute(path) ? path : join(cwd(), path);
    this.json = pathExistsSync(this.absolutePath) ? readJSONSync(this.absolutePath) : {};
    this.writeDataLoader = new DataLoader(async keys => {
      await writeJSON(this.absolutePath, this.json);
      return keys;
    });
  }

  async get(name: string) {
    return get(this.json, name);
  }

  async set(name: string, value: V) {
    set(this.json, name, value);
    this.writeDataLoader.load({});
  }

  async delete(name: string) {
    this.set(name, undefined);
  }
}
