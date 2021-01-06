import { getMeshInstance } from './getMeshInstance';
import LocalforageCache from '@graphql-mesh/cache-localforage';
import { getSdk, Sdk } from './sdk.generated';
import { useEffect, useState } from 'react';

export function useMeshSdk() {
  const [meshSdk, setMeshSdk] = useState<Sdk>();
  useEffect(() => {
    getMeshInstance({
      cache: new LocalforageCache(),
    }).then(mesh => {
      setMeshSdk(getSdk(mesh.sdkRequester));
    });
  }, []);
  return meshSdk;
}
