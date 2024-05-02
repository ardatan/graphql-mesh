/* eslint-disable import/no-extraneous-dependencies */
import { MeshFetch } from '@graphql-mesh/types';
import { MeshServePlugin } from './types.js';

export function useCustomFetch(fetch: MeshFetch): MeshServePlugin {
  return {
    onFetch({ setFetchFn }) {
      setFetchFn(fetch);
    },
  };
}
