/* eslint-disable import/no-extraneous-dependencies */
import type { MeshFetch } from '@graphql-mesh/types';
import type { MeshServePlugin } from '../types.js';

export function useCustomFetch(fetch: MeshFetch): MeshServePlugin {
  return {
    onFetch({ setFetchFn }) {
      setFetchFn(fetch);
    },
  };
}
