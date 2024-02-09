/* eslint-disable import/no-extraneous-dependencies */
import { MeshFetch } from '@graphql-mesh/types';
import { MeshServePlugin } from './types';

export function useCustomFetch<TServerContext, TUserContext>(
  fetch: MeshFetch,
): MeshServePlugin<TServerContext, TUserContext> {
  return {
    onFetch({ setFetchFn }) {
      setFetchFn(fetch);
    },
  };
}
