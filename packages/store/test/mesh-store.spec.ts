import {
  InMemoryStoreStorageAdapter,
  MeshStore,
  PredefinedProxyOptions,
  ReadonlyStoreError,
  ValidationError,
} from '../src/index.js';

describe('MeshStore and storage', () => {
  describe('MeshStore', () => {
    const storage = new InMemoryStoreStorageAdapter();

    beforeEach(() => {
      storage.clear();
    });

    it('should read/write when store is writable', async () => {
      const store = new MeshStore('test', storage, { readonly: false, validate: false });
      const item = store.proxy('file.json', PredefinedProxyOptions.JsonWithoutValidation);

      let value = await item.get();
      expect(value).toBeUndefined();
      await item.set({ test: 1 });
      value = await item.get();
      expect(value).toBeDefined();
      expect(value.test).toBe(1);
    });

    it('should prevent write when store is readonly', async () => {
      expect.assertions(3);
      const store = new MeshStore('test', storage, { readonly: true, validate: false });
      const item = store.proxy('file.json', PredefinedProxyOptions.JsonWithoutValidation);

      const value = await item.get();
      expect(value).toBeUndefined();

      try {
        await item.set({ test: 1 });
      } catch (e) {
        expect(e instanceof ReadonlyStoreError).toBeTruthy();
        expect(e.message).toBe(
          `Unable to set value for "file.json" under "test" because the store is in read-only mode.`,
        );
      }
    });

    it('should validate writes and prevent write in case of a validation error', async () => {
      expect.assertions(3);
      const store = new MeshStore('test', storage, { readonly: false, validate: true });
      const item = store.proxy('file.json', {
        codify: value => `module.exports = ${JSON.stringify(value)}`,
        validate: (a: any, b: any) => {
          if (a.test === 1 && b.test === 2) {
            throw new Error('Validation failed! you changed 1 to 2!');
          }
        },
        fromJSON: value => value,
        toJSON: value => value,
      });

      try {
        await item.set({ test: 1 });
      } catch (e) {
        // Shouldn't get there, no validations at first write
        expect(true).toBeFalsy();
      }

      try {
        await item.set({ test: 2 });
      } catch (e) {
        expect(e instanceof ValidationError).toBeTruthy();
        expect(e.message).toBe(
          `Validation failed for "file.json" under "test": Validation failed! you changed 1 to 2!`,
        );
      }

      const value = await item.get();
      expect(value).toStrictEqual({
        test: 1,
      });
    });
  });
});
