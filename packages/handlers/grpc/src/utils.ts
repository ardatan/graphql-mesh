import { KeyValueCache } from '@graphql-mesh/types';
import { jsonFlatStringify, readFileOrUrlWithCache } from '@graphql-mesh/utils';
import { ClientReadableStream, ClientUnaryCall, Metadata, MetadataValue } from '@grpc/grpc-js';
import { existsSync } from 'fs';
import { SchemaComposer } from 'graphql-compose';
import _ from 'lodash';
import { isAbsolute, join } from 'path';
import { Root } from 'protobufjs';

import { getGraphQLScalar, isScalarType } from './scalars';

export type ClientMethod = (
  input: unknown,
  metaData?: Metadata
) => Promise<ClientUnaryCall> | AsyncIterator<ClientReadableStream<unknown>>;

export function getTypeName(schemaComposer: SchemaComposer, pathWithName: string[], isInput: boolean) {
  const baseTypeName = pathWithName.join('_');
  if (isScalarType(baseTypeName)) {
    return getGraphQLScalar(baseTypeName);
  }
  if (schemaComposer.isEnumType(baseTypeName)) {
    return baseTypeName;
  }
  return isInput ? baseTypeName + '_Input' : baseTypeName;
}

export function addIncludePathResolver(root: Root, includePaths: string[]): void {
  const originalResolvePath = root.resolvePath;
  root.resolvePath = (origin: string, target: string) => {
    if (isAbsolute(target)) {
      return target;
    }
    for (const directory of includePaths) {
      const fullPath: string = join(directory, target);
      if (existsSync(fullPath)) {
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

export function addMetaDataToCall(
  call: ClientMethod,
  input: unknown,
  context: Record<string, unknown>,
  metaData: Record<string, string | string[] | Buffer>
): Promise<ClientUnaryCall> | AsyncIterator<ClientReadableStream<unknown>> {
  if (metaData) {
    const meta = new Metadata();
    for (const [key, value] of Object.entries(metaData)) {
      let metaValue: unknown = value;
      if (Array.isArray(value)) {
        // Extract data from context
        metaValue = _.get(context, value);
      }
      // Ensure that the metadata is compatible with what node-grpc expects
      if (typeof metaValue !== 'string' && !(metaValue instanceof Buffer)) {
        metaValue = jsonFlatStringify(metaValue);
      }

      meta.add(key, metaValue as MetadataValue);
    }

    return call(input, meta);
  }
  return call(input);
}

export async function getBuffer(path: string, cache: KeyValueCache, cwd: string): Promise<Buffer> {
  if (path) {
    const result = await readFileOrUrlWithCache<string>(path, cache, {
      allowUnknownExtensions: true,
      cwd,
    });
    return Buffer.from(result);
  }
  return undefined;
}
