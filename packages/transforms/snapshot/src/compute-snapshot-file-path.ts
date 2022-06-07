import { path } from '@graphql-mesh/cross-helpers';
import objectHash from 'object-hash';
import { GraphQLResolveInfo } from 'graphql';

export function computeSnapshotFilePath(options: {
  info: GraphQLResolveInfo;
  args: any;
  outputDir: string;
  respectSelectionSet?: boolean;
}) {
  const typeName = options.info.parentType.name;
  const fieldName = options.info.fieldName;
  const hashObj = options.respectSelectionSet
    ? {
        args: options.args,
        fieldNodes: options.info.fieldNodes,
      }
    : options.args;
  const hash = objectHash(hashObj, { ignoreUnknown: true }).toString();
  const fileName = [typeName, fieldName, hash].join('_') + '.json';
  return path.join(options.outputDir, fileName);
}
