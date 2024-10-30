import lodashGet from 'lodash.get';
import type { ResolverData } from '@graphql-mesh/string-interpolation';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { withCancel } from '@graphql-mesh/utils';
import type {
  ClientDuplexStream,
  ClientReadableStream,
  ClientUnaryCall,
  MetadataValue,
} from '@grpc/grpc-js';
import { Metadata } from '@grpc/grpc-js';
import type { GraphQLScalarType } from 'graphql';

function isBlob(input: any): input is Blob {
  return input != null && input.stream instanceof Function;
}

export function addMetaDataToCall(
  callFn: any,
  input: any,
  resolverData: ResolverData,
  metaData: Record<string, string | string[] | Buffer>,
  isResponseStream = false,
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
      },
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
