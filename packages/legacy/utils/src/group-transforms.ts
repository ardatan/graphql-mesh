import type { MeshTransform } from '@graphql-mesh/types';

export function groupTransforms(transforms: MeshTransform[]) {
  const wrapTransforms: MeshTransform[] = [];
  const noWrapTransforms: MeshTransform[] = [];
  transforms?.forEach(transform => {
    if (transform.noWrap) {
      noWrapTransforms.push(transform);
    } else {
      wrapTransforms.push(transform);
    }
  });
  return { wrapTransforms, noWrapTransforms };
}
