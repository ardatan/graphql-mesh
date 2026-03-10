import { wrapFetchWithPlugins } from '@graphql-mesh/runtime';
import type { KeyValueCache } from '@graphql-mesh/types';
import { createServerAdapter, fakePromise } from '@whatwg-node/server';
import useHTTPCache from '../src/index';

describe('HTTP Cache Control behavior', () => {
  interface CacheEntry {
    expiresAt?: Date;
    value: any;
  }

  const map = new Map<string, CacheEntry>();
  const cacheStore: KeyValueCache = {
    get(key) {
      const entry = map.get(key);
      if (!entry) {
        return fakePromise(undefined);
      }
      if (entry.expiresAt < new Date()) {
        map.delete(key);
        return fakePromise(undefined);
      }
      return fakePromise(entry.value);
    },
    set(key, value, opts) {
      const expiresAt = opts?.ttl ? new Date(Date.now() + opts.ttl * 1000) : undefined;
      map.set(key, { value, expiresAt });
      return fakePromise();
    },
    delete(key) {
      const deleted = map.delete(key);
      return fakePromise(deleted);
    },
    getKeysByPrefix(prefix) {
      const keys = Array.from(map.keys()).filter(key => key.startsWith(prefix));
      return fakePromise(keys);
    },
  };
  function checkExpiredAt() {
    const now = new Date();
    for (const [key, entry] of map.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        map.delete(key);
      }
    }
  }
  afterEach(() => {
    map.clear();
  });
  it('No Cache-Control header', async () => {
    const serverAdapterFn = jest.fn(() => Response.json({ message: 'Hello World' }));
    const serverAdapter = createServerAdapter(serverAdapterFn);
    const wrappedFetch = wrapFetchWithPlugins([
      {
        onFetch({ setFetchFn }) {
          setFetchFn(serverAdapter.fetch);
        },
      },
      useHTTPCache({
        cache: cacheStore,
      }),
    ]);
    const url = 'http://test.com/data';
    const opts = { method: 'GET' };
    const response1 = await wrappedFetch(url, opts, {});
    expect(await response1.json()).toEqual({ message: 'Hello World' });
    const response2 = await wrappedFetch(url, opts, {});
    expect(await response2.json()).toEqual({ message: 'Hello World' });
    expect(serverAdapterFn).toHaveBeenCalledTimes(2);
    expect(map.size).toBe(0);
  });
  const maxAgeHeaders = ['max-age', 's-maxage'];
  for (const maxAgeHeader of maxAgeHeaders) {
    it(`Cache-Control: ${maxAgeHeader}=0`, async () => {
      const serverAdapterFn = jest.fn(() =>
        Response.json(
          { message: 'Hello World' },
          { headers: { 'Cache-Control': `${maxAgeHeader}=0` } },
        ),
      );
      const serverAdapter = createServerAdapter(serverAdapterFn);
      const wrappedFetch = wrapFetchWithPlugins([
        {
          onFetch({ setFetchFn }) {
            setFetchFn(serverAdapter.fetch);
          },
        },
        useHTTPCache({
          cache: cacheStore,
        }),
      ]);
      const url = 'http://test.com/data';
      const opts = { method: 'GET' };
      const response1 = await wrappedFetch(url, opts, {});
      expect(await response1.json()).toEqual({ message: 'Hello World' });
      const response2 = await wrappedFetch(url, opts, {});
      expect(await response2.json()).toEqual({ message: 'Hello World' });
      expect(serverAdapterFn).toHaveBeenCalledTimes(2);
      expect(map.size).toBe(0);
    });
    it(`Cache-Control: ${maxAgeHeader}=3`, async () => {
      const serverAdapterFn = jest.fn(() =>
        Response.json(
          { message: 'Hello World' },
          { headers: { 'Cache-Control': `${maxAgeHeader}=3` } },
        ),
      );
      const serverAdapter = createServerAdapter(serverAdapterFn);
      const wrappedFetch = wrapFetchWithPlugins([
        {
          onFetch({ setFetchFn }) {
            setFetchFn(serverAdapter.fetch);
          },
        },
        useHTTPCache({
          cache: cacheStore,
        }),
      ]);
      const url = 'http://test.com/data';
      const opts = { method: 'GET' };
      const response1 = await wrappedFetch(url, opts, {});
      expect(await response1.json()).toEqual({ message: 'Hello World' });
      const response2 = await wrappedFetch(url, opts, {});
      expect(await response2.json()).toEqual({ message: 'Hello World' });
      expect(serverAdapterFn).toHaveBeenCalledTimes(1);
      expect(map.size).toBe(1);
      await new Promise(resolve => setTimeout(resolve, 4_000));
      checkExpiredAt();
      expect(map.size).toBe(0);
    });
  }
});
