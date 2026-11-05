import type { SchemaComposer } from 'graphql-compose';
import lodashHas from 'lodash.has';
import type { INamespace, Root } from 'protobufjs';
import { fs, path as pathModule } from '@graphql-mesh/cross-helpers';
import { getGraphQLScalarForGrpc, isGrpcScalar } from './scalars.js';

export function addIncludePathResolver(root: Root, includePaths: string[]): void {
  const originalResolvePath = root.resolvePath;
  root.resolvePath = (origin: string, target: string) => {
    if (pathModule.isAbsolute(target)) {
      return target;
    }
    for (const directory of includePaths) {
      const fullPath: string = pathModule.join(directory, target);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    const path = originalResolvePath(origin, target);
    if (path === null) {
      console.warn(`${target} not found in any of the include paths ${includePaths}`);
    }
    return path;
  };
}

export function getTypeName(
  schemaComposer: SchemaComposer,
  pathWithName: string[] | undefined,
  isInput: boolean,
) {
  if (pathWithName?.length) {
    const baseTypeName = pathWithName.filter(Boolean).join('__');
    if (isGrpcScalar(baseTypeName)) {
      return getGraphQLScalarForGrpc(baseTypeName);
    }
    if (schemaComposer.isEnumType(baseTypeName)) {
      return baseTypeName;
    }
    return isInput ? baseTypeName + '_Input' : baseTypeName;
  }
  return 'Void';
}

export function walkToFindTypePath(
  rootJson: INamespace,
  pathWithName: string[],
  baseTypePath: string[],
) {
  const currentWalkingPath = [...pathWithName];
  while (!lodashHas(rootJson.nested, currentWalkingPath.concat(baseTypePath).join('.nested.'))) {
    if (!currentWalkingPath.length) {
      break;
    }
    currentWalkingPath.pop();
  }
  return currentWalkingPath.concat(baseTypePath);
}
