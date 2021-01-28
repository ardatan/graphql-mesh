import { KeyValueCache } from '@graphql-mesh/types';
import { isAbsolute, join } from 'path';
import { get, set } from 'lodash';
import { existsSync } from 'fs';
import DataLoader from 'dataloader';
import { readJSONSync, writeJSON } from '@graphql-mesh/utils';

export default class FileCache<V = string> implements KeyValueCache<V> {
  json: Record<string, V>;
  absolutePath: string;
  writeDataLoader: DataLoader<any, any>;
  constructor({ path }: { path: string }) {
    this.absolutePath = isAbsolute(path) ? path : join(process.cwd(), path);
    this.json = existsSync(this.absolutePath) ? readJSONSync(this.absolutePath) : {};
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
