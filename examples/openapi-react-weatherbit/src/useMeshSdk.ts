import { getMeshSDK, Sdk } from '../.mesh';
import { useEffect, useState } from 'react';

export function useMeshSdk() {
  const [meshSdk, setMeshSdk] = useState<Sdk>();
  useEffect(() => {
    getMeshSDK().then(meshSdk => setMeshSdk(meshSdk));
  }, []);
  return meshSdk;
}
