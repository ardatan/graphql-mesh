/* eslint-disable import/no-extraneous-dependencies */
import { MeshFetch } from '@graphql-mesh/types';
import { MeshHTTPPlugin } from './types';

export function useCustomFetch<TServerContext, TUserContext>(
  fetch: MeshFetch,
): MeshHTTPPlugin<TServerContext, TUserContext> {
  return {
    onFetch({ setFetchFn }) {
      setFetchFn(fetch);
    },
  };
}
