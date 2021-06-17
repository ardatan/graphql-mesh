import { join } from 'path';
import { hashObject } from '@graphql-mesh/utils';
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
  const hash = hashObject(hashObj);
  const fileName = [typeName, fieldName, hash].join('_') + '.json';
  return join(options.outputDir, fileName);
}
