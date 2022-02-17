import { promises as fsPromises } from 'fs';
import { isAbsolute, join } from 'path';
import { flatString, writeFile, AggregateError } from '@graphql-mesh/utils';
import { CriticalityLevel, diff } from '@graphql-inspector/core';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { ImportFn } from '@graphql-mesh/types';

export class ReadonlyStoreError extends Error {}

export class ValidationError extends Error {}

export type StoreStorageAdapter<TData = any, TKey = string> = {
  read: (key: TKey, options: ProxyOptions<TData>) => Promise<TData>;
  write: (key: TKey, data: TData, options: ProxyOptions<TData>) => Promise<TData>;
  delete: (key: TKey) => Promise<void>;
};

export class InMemoryStoreStorageAdapter implements StoreStorageAdapter {
  private data = new Map<string, any>();

  async read<TData>(key: string, options: ProxyOptions<any>): Promise<TData> {
    return this.data.get(key);
  }

  async write<TData>(key: string, data: TData, options: ProxyOptions<any>): Promise<void> {
    this.data.set(key, data);
  }

  async delete(key: string) {
    this.data.delete(key);
  }

  clear() {
    this.data.clear();
  }
}

export interface FsStoreStorageAdapterOptions {
  cwd: string;
  importFn: ImportFn;
}

export class FsStoreStorageAdapter implements StoreStorageAdapter {
  constructor(private options: FsStoreStorageAdapterOptions) {}
  private getWrittenFileName(key: string) {
    const jsFileName = `${key}.cjs`;
    return isAbsolute(jsFileName) ? jsFileName : join(this.options.cwd, jsFileName);
  }

  async read<TData>(key: string, options: ProxyOptions<any>): Promise<TData> {
    const filePath = this.getWrittenFileName(key);
    try {
      return await this.options.importFn(filePath).then(m => m.default || m);
    } catch (e) {
      if (e.message.startsWith('Cannot find module')) {
        return undefined;
      }
      throw e;
    }
  }

  async write<TData>(key: string, data: TData, options: ProxyOptions<any>): Promise<void> {
    const asString = await options.codify(data, key);
    const filePath = this.getWrittenFileName(key);
    await writeFile(filePath, flatString(asString));
    await this.options.importFn(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getWrittenFileName(key);
    const { unlink } = fsPromises;
    return unlink(filePath);
  }
}

export type StoreProxy<TData> = {
  set(value: TData): Promise<void>;
  get(): Promise<TData>;
  getWithSet(setterFn: () => TData | Promise<TData>): Promise<TData>;
  delete(): Promise<void>;
};

export type ProxyOptions<TData> = {
  codify: (value: TData, identifier: string) => string | Promise<string>;
  validate: (oldValue: TData, newValue: TData, identifier: string) => void | Promise<void>;
};

export type StoreFlags = {
  readonly: boolean;
  validate: boolean;
};

export enum PredefinedProxyOptionsName {
  JsonWithoutValidation = 'JsonWithoutValidation',
  StringWithoutValidation = 'StringWithoutValidation',
  GraphQLSchemaWithDiffing = 'GraphQLSchemaWithDiffing',
}

const escapeForTemplateLiteral = (str: string) => str.split('`').join('\\`').split('$').join('\\$');

export const PredefinedProxyOptions: Record<PredefinedProxyOptionsName, ProxyOptions<any>> = {
  JsonWithoutValidation: {
    codify: v => `module.exports = ${JSON.stringify(v, null, 2)}`,
    validate: () => null,
  },
  StringWithoutValidation: {
    codify: v => `module.exports = \`${escapeForTemplateLiteral(v)}\``,
    validate: () => null,
  },
  GraphQLSchemaWithDiffing: {
    codify: (schema, identifier) =>
      `
const { buildSchema, Source } = require('graphql');

const source = new Source(/* GraphQL */\`
${escapeForTemplateLiteral(printSchemaWithDirectives(schema))}
\`, \`${identifier}\`);

module.exports = buildSchema(source, {
  assumeValid: true,
  assumeValidSDL: true
});
    `.trim(),
    validate: async (oldSchema, newSchema) => {
      const changes = await diff(oldSchema, newSchema);
      const errors: string[] = [];
      for (const change of changes) {
        if (
          change.criticality.level === CriticalityLevel.Breaking ||
          change.criticality.level === CriticalityLevel.Dangerous
        ) {
          errors.push(change.message);
        }
      }
      if (errors.length) {
        throw new AggregateError(errors);
      }
    },
  },
};

export class MeshStore {
  constructor(public identifier: string, protected storage: StoreStorageAdapter, public flags: StoreFlags) {}

  child(childIdentifier: string, flags?: Partial<StoreFlags>): MeshStore {
    return new MeshStore(join(this.identifier, childIdentifier), this.storage, {
      ...this.flags,
      ...flags,
    });
  }

  proxy<TData>(id: string, options: ProxyOptions<TData>): StoreProxy<TData> {
    const path = join(this.identifier, id);
    let value: TData | null | undefined;
    let isValueCached = false;

    const ensureValueCached = async () => {
      if (!isValueCached) {
        value = await this.storage.read(path, options);
        isValueCached = true;
      }
    };

    const doValidation = async (newValue: TData) => {
      await ensureValueCached();
      if (value && newValue) {
        try {
          await options.validate(value, newValue, id);
        } catch (e) {
          throw new ValidationError(`Validation failed for "${id}" under "${this.identifier}": ${e.message}`);
        }
      }
    };

    const proxy: StoreProxy<TData> = {
      getWithSet: async (setterFn: () => TData | Promise<TData>) => {
        await ensureValueCached();
        if (this.flags.validate || !value) {
          const newValue = await setterFn();
          if (this.flags.validate && this.flags.readonly) {
            await doValidation(newValue);
          }
          if (!this.flags.readonly) {
            await proxy.set(newValue);
          }
        }
        return value;
      },
      get: async () => {
        await ensureValueCached();

        return value;
      },
      set: async newValue => {
        if (this.flags.readonly) {
          throw new ReadonlyStoreError(
            `Unable to set value for "${id}" under "${this.identifier}" because the store is in read-only mode.`
          );
        }

        if (this.flags.validate) {
          await doValidation(newValue);
        }

        value = newValue;
        isValueCached = true;
        await this.storage.write(path, value, options);
      },
      delete: () => this.storage.delete(path),
    };

    return proxy;
  }
}
