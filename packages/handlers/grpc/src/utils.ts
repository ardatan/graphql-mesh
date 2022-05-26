import { withCancel } from '@graphql-mesh/utils';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { ClientDuplexStream, ClientReadableStream, ClientUnaryCall, Metadata, MetadataValue } from '@grpc/grpc-js';
import { fs, path as pathModule } from '@graphql-mesh/cross-helpers';
import { SchemaComposer } from 'graphql-compose';
import lodashGet from 'lodash/get';
import { Root } from 'protobufjs';

import { getGraphQLScalar, isScalarType } from './scalars';

export function getTypeName(schemaComposer: SchemaComposer, pathWithName: string[] | undefined, isInput: boolean) {
  if (pathWithName?.length) {
    const baseTypeName = pathWithName.filter(Boolean).join('_');
    if (isScalarType(baseTypeName)) {
      return getGraphQLScalar(baseTypeName);
    }
    if (schemaComposer.isEnumType(baseTypeName)) {
      return baseTypeName;
    }
    return isInput ? baseTypeName + '_Input' : baseTypeName;
  }
  return 'Void';
}

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

function isBlob(input: any): input is Blob {
  return input != null && input.stream instanceof Function;
}

export function addMetaDataToCall(
  callFn: any,
  input: any,
  context: Record<string, unknown>,
  metaData: Record<string, string | string[] | Buffer>,
  isResponseStream = false
) {
  const callFnArguments: any[] = [];
  if (!isBlob(input)) {
    callFnArguments.push(input);
  }
  if (metaData) {
    const meta = new Metadata();
    for (const [key, value] of Object.entries(metaData)) {
      let metaValue: unknown = value;
      if (Array.isArray(value)) {
        // Extract data from context
        metaValue = lodashGet(context, value);
      }

      // Ensure that the metadata is compatible with what node-grpc expects
      if (typeof metaValue !== 'string' && !(metaValue instanceof Buffer)) {
        metaValue = JSON.stringify(metaValue);
      }

      if (typeof metaValue === 'string') {
        metaValue = stringInterpolator.parse(metaValue, context);
      }

      meta.add(key, metaValue as MetadataValue);
    }
    callFnArguments.push(meta);
  }
  return new Promise((resolve, reject) => {
    const call: ClientDuplexStream<any, any> = callFn(
      ...callFnArguments,
      (error: Error, response: ClientUnaryCall | ClientReadableStream<unknown>) => {
        if (error) {
          reject(error);
        }
        resolve(response);
      }
    );
    if (isResponseStream) {
      let isCancelled = false;
      const responseStreamWithCancel = withCancel(call, () => {
        if (!isCancelled) {
          call.call?.cancelWithStatus(0, 'Cancelled by GraphQL Mesh');
          isCancelled = true;
        }
      });
      resolve(responseStreamWithCancel);
      if (isBlob(input)) {
        input.stream().pipe(call);
      }
    }
  });
}
