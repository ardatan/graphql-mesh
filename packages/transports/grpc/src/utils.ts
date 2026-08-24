import type { GraphQLScalarType } from 'graphql';
import lodashGet from 'lodash.get';
import type { ResolverData } from '@graphql-mesh/string-interpolation';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { withCancel } from '@graphql-mesh/utils';
import type {
  CallOptions,
  ClientDuplexStream,
  ClientReadableStream,
  ClientUnaryCall,
  MetadataValue,
} from '@grpc/grpc-js';
import { Metadata } from '@grpc/grpc-js';

function isBlob(input: any): input is Blob {
  return input != null && input.stream instanceof Function;
}

export function buildGrpcMetadata(
  metaData: Record<string, string | string[] | Buffer> | [string, string][] | undefined,
  resolverData: ResolverData,
): Metadata | undefined {
  if (!metaData) {
    return undefined;
  }
  const meta = new Metadata();
  const entries = Array.isArray(metaData) ? Object.fromEntries(metaData) : metaData;
  for (const [key, value] of Object.entries(entries)) {
    let metaValue: unknown = value;
    if (Array.isArray(value)) {
      // Extract data from context
      metaValue = lodashGet(resolverData.context, value);
    }

    // Ensure that the metadata is compatible with what node-grpc expects
    if (typeof metaValue !== 'string' && !(metaValue instanceof Buffer)) {
      metaValue = JSON.stringify(metaValue);
    }

    if (typeof metaValue === 'string') {
      metaValue = stringInterpolator.parse(metaValue, resolverData);
    }

    meta.add(key, metaValue as MetadataValue);
  }
  return meta;
}

export function addMetaDataToCall(
  callFn: any,
  input: any,
  resolverData: ResolverData,
  metaData: Record<string, string | string[] | Buffer> | [string, string][],
  isResponseStream = false,
  requestTimeout?: number,
) {
  const callFnArguments: any[] = [];
  if (!isBlob(input)) {
    callFnArguments.push(input);
  }
  const meta = buildGrpcMetadata(metaData, resolverData);
  const callOptions: CallOptions = {};
  if (requestTimeout != null && requestTimeout > 0) {
    callOptions.deadline = Date.now() + requestTimeout;
  }
  const hasCallOptions = Object.keys(callOptions).length > 0;
  if (meta || hasCallOptions) {
    // grpc-js accepts (argument, metadata, options, callback)
    callFnArguments.push(meta ?? new Metadata());
    if (hasCallOptions) {
      callFnArguments.push(callOptions);
    }
  }
  return new Promise((resolve, reject) => {
    const call: ClientDuplexStream<any, any> = callFn(
      ...callFnArguments,
      (error: Error, response: ClientUnaryCall | ClientReadableStream<unknown>) => {
        if (error) {
          reject(error);
        }
        resolve(response);
      },
    );
    if (isResponseStream) {
      let isCancelled = false;
      const responseStreamWithCancel = withCancel(call, reason => {
        if (!isCancelled) {
          call.call?.cancelWithStatus(0, reason?.toString() || 'aborted');
          isCancelled = true;
        }
      });
      resolve(responseStreamWithCancel);
      if (isBlob(input)) {
        const blobStream = input.stream();
        (blobStream as any).pipe(call);
      }
    }
  });
}

export function addExecutionLogicToScalar(
  nonExecutableScalar: GraphQLScalarType,
  actualScalar: GraphQLScalarType,
) {
  Object.defineProperties(nonExecutableScalar, {
    serialize: {
      value: actualScalar.serialize,
    },
    parseValue: {
      value: actualScalar.parseValue,
    },
    parseLiteral: {
      value: actualScalar.parseLiteral,
    },
    extensions: {
      value: {
        ...actualScalar.extensions,
        ...nonExecutableScalar.extensions,
      },
    },
  });
}
