import { buildASTSchema } from 'graphql';
import { CriticalityLevel, diff } from '@graphql-inspector/core';
import { fs, path as pathModule } from '@graphql-mesh/cross-helpers';
import type { ImportFn } from '@graphql-mesh/types';
import { writeFile } from '@graphql-mesh/utils';
import { getDocumentNodeFromSchema } from '@graphql-tools/utils';

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
  fileType: 'ts' | 'json' | 'js';
}

export class FsStoreStorageAdapter implements StoreStorageAdapter {
  constructor(private options: FsStoreStorageAdapterOptions) {}
  private getAbsolutePath(jsFileName: string) {
    return pathModule.isAbsolute(jsFileName)
      ? jsFileName
      : pathModule.join(this.options.cwd, jsFileName);
  }

  async read<TData, TJSONData = any>(
    key: string,
    options: ProxyOptions<TData, TJSONData>,
  ): Promise<TData> {
    let absoluteModulePath = this.getAbsolutePath(key);
    if (this.options.fileType !== 'ts') {
      absoluteModulePath += '.' + this.options.fileType;
    }
    try {
      const importedData = await this.options
        .importFn(absoluteModulePath)
        .then(m => m.default || m);
      if (this.options.fileType === 'json') {
        return await options.fromJSON(importedData, key);
      }
      return importedData;
    } catch (e) {
      if (e.message.startsWith('Cannot find module')) {
        return undefined;
      }
      throw e;
    }
  }

  async write<TData, TJSONData = any>(
    key: string,
    data: TData,
    options: ProxyOptions<TData, TJSONData>,
  ): Promise<void> {
    const asString =
      this.options.fileType === 'json'
        ? JSON.stringify(await options.toJSON(data, key))
        : `// @ts-nocheck\n` + (await options.codify(data, key));
    const modulePath = this.getAbsolutePath(key);
    const filePath = modulePath + '.' + this.options.fileType;
    try {
      await writeFile(filePath, asString);
      await this.options.importFn(this.options.fileType !== 'ts' ? filePath : modulePath);
    } catch (e) {
      console.warn(`Unable to write file "${filePath}". This might cause an inconsistency.`, e);
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getAbsolutePath(key) + '.' + this.options.fileType;
    return fs.promises.unlink(filePath);
  }
}

export type StoreProxy<TData> = {
  set(value: TData): Promise<void>;
  get(): Promise<TData>;
  getWithSet(setterFn: () => TData | Promise<TData>): Promise<TData>;
  delete(): Promise<void>;
};

export type ProxyOptions<TData, TJSONData = any> = {
  codify: (value: TData, identifier: string) => string | Promise<string>;
  fromJSON: (jsonData: TJSONData, identifier: string) => TData | Promise<TData>;
  toJSON: (value: TData, identifier: string) => TJSONData | Promise<TJSONData>;
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

export const PredefinedProxyOptions: Record<PredefinedProxyOptionsName, ProxyOptions<any>> = {
  JsonWithoutValidation: {
    codify: v => `export default ${JSON.stringify(v, null, 2)}`,
    fromJSON: v => v,
    toJSON: v => v,
    validate: () => null,
  },
  StringWithoutValidation: {
    codify: v => `export default ${JSON.stringify(v, null, 2)}`,
    fromJSON: v => v,
    toJSON: v => v,
    validate: () => null,
  },
  GraphQLSchemaWithDiffing: {
    codify: schema =>
      `
import { buildASTSchema } from 'graphql';

const schemaAST = ${JSON.stringify(getDocumentNodeFromSchema(schema), null, 2)};

export default buildASTSchema(schemaAST, {
  assumeValid: true,
  assumeValidSDL: true
});
    `.trim(),
    fromJSON: schemaAST => buildASTSchema(schemaAST, { assumeValid: true, assumeValidSDL: true }),
    toJSON: schema => getDocumentNodeFromSchema(schema),
    validate: async (oldSchema, newSchema) => {
      const changes = await diff(oldSchema, newSchema);
      const errors: string[] = [];
      for (const change of changes) {
        if (
          (change.criticality.level === CriticalityLevel.Breaking ||
            change.criticality.level === CriticalityLevel.Dangerous) &&
          !change.message.includes('@specifiedBy') &&
          !change.message.includes('@deprecated')
        ) {
          errors.push(change.message);
        }
      }
      if (errors.length) {
        if (errors.length === 1) {
          throw errors[0];
        } else {
          throw new Error(
            `Breaking changes found; \n${errors.map(error => `- ${error}`).join('\n')}`,
          );
        }
      }
    },
  },
};

export class MeshStore {
  constructor(
    public identifier: string,
    protected storage: StoreStorageAdapter,
    public flags: StoreFlags,
  ) {}

  child(childIdentifier: string, flags?: Partial<StoreFlags>): MeshStore {
    return new MeshStore(pathModule.join(this.identifier, childIdentifier), this.storage, {
      ...this.flags,
      ...flags,
    });
  }

  proxy<TData>(id: string, options: ProxyOptions<TData>): StoreProxy<TData> {
    const path = pathModule.join(this.identifier, id);
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
          throw new ValidationError(
            `Validation failed for "${id}" under "${this.identifier}": ${e.message}`,
          );
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
            `Unable to set value for "${id}" under "${this.identifier}" because the store is in read-only mode.`,
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
