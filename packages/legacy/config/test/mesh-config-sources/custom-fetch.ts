import type { MeshFetchRequestInit } from '@graphql-mesh/types';
import { fetch } from '@whatwg-node/fetch';

export default function (url: string, options?: MeshFetchRequestInit) {
  return fetch(url, options);
}
