import { ImportFn, KeyValueCache } from '@graphql-mesh/types';
import { isAbsolute, join } from 'path';
import _ from 'lodash';
import DataLoader from 'dataloader';
import { writeJSON } from '@graphql-mesh/utils';
import { cwd } from 'process';

export default class FileCache<V = any> implements KeyValueCache<V> {
  json$: Promise<Record<string, V>>;
  absolutePath: string;
  writeDataLoader: DataLoader<any, any>;
  constructor({ path, importFn }: { path: string; importFn: ImportFn }) {
    this.absolutePath = isAbsolute(path) ? path : join(cwd(), path);
    this.json$ = importFn(this.absolutePath);
    this.writeDataLoader = new DataLoader(async keys => {
      const json = await this.json$;
      await writeJSON(this.absolutePath, json);
      return keys;
    });
  }

  async get(name: string) {
    const json = await this.json$;
    return _.get(json, name);
  }

  async set(name: string, value: V) {
    const json = await this.json$;
    _.set(json, name, value);
    await this.writeDataLoader.load({});
  }

  async delete(name: string) {
    const json = await this.json$;
    json[name] = undefined;
  }
}
