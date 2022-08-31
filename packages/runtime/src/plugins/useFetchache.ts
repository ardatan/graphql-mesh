import { KeyValueCache, MeshPlugin } from '@graphql-mesh/types';
import { Request, Response } from '@whatwg-node/fetch';
import { fetchFactory } from 'fetchache';

export function useFetchache(cache: KeyValueCache<any>): MeshPlugin<any> {
  return {
    onFetch({ fetchFn, setFetchFn }) {
      setFetchFn(
        fetchFactory({
          cache,
          fetch: fetchFn,
          Request,
          Response,
        })
      );
    },
  };
}
