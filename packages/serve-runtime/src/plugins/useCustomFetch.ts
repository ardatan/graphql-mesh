/* eslint-disable import/no-extraneous-dependencies */
import type { MeshFetch } from '@graphql-mesh/types';
import type { GatewayPlugin } from '../types.js';

export function useCustomFetch(fetch: MeshFetch): GatewayPlugin {
  return {
    onFetch({ setFetchFn }) {
      setFetchFn(fetch);
    },
  };
}
