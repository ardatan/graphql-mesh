import { MeshTransform } from '@graphql-mesh/utils';

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
